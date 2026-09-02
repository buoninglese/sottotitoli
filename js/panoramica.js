    /* ── Language toggle highlight ── */
    window.addEventListener('i18n-changed', function(e){
      var lang = e.detail.lang;
      var itBtn = document.getElementById('langIt');
      var enBtn = document.getElementById('langEn');
      if (itBtn) itBtn.style.color = lang === 'it' ? 'var(--teal)' : 'var(--text-faint)';
      if (enBtn) enBtn.style.color = lang === 'en' ? 'var(--teal)' : 'var(--text-faint)';
      // Force brand to always stay "sottotitoli.pro" (anchor + separate .pro span)
      var br=document.querySelector('.topbar-brand');if(br&&br.firstChild)br.firstChild.textContent='sottotitoli';
      // Re-render hero text in the new language
      if (window.renderHero) window.renderHero(window._settingsData && window._settingsData.display_name);
    });
    // Force brand on initial load too (i18n may have already run)
    window.addEventListener('load',function(){
      var br=document.querySelector('.topbar-brand');if(br&&br.firstChild)br.firstChild.textContent='sottotitoli';
    });
    /* ── Utility: format minutes to readable string ── */
    function fmtMinutes(m) {
      if (!m || m < 1) return '0m';
      if (m < 60) return m + 'm';
      var h = Math.floor(m / 60);
      var rm = m % 60;
      return rm > 0 ? h + 'h ' + rm + 'm' : h + 'h';
    }
    // Add tooltip labels to sparkline bars (last 7 days context)
    function initSparklineTooltips() {
      document.querySelectorAll('.sparkline').forEach(function(sl){
        var card=sl.closest('.metric-card');
        var metric=card?card.getAttribute('data-metric'):'';
        var isEn = window.I18n && I18n.getLang() === 'en';
        var labels = isEn ? {'totalSessions':'sessions','totalMinutes':'minutes','totalWords':'words','avgWpm':'WPM','avgLexDiv':'diversity'} : {'totalSessions':'sessioni','totalMinutes':'minuti','totalWords':'parole','avgWpm':'WPM','avgLexDiv':'diversità'};
        var label=labels[metric]||'valore';
        var days= isEn ? ['6d ago','5d ago','4d ago','3d ago','2d ago','yesterday','today'] : ['6g fa','5g fa','4g fa','3g fa','2g fa','ieri','oggi'];
        sl.querySelectorAll('.bar').forEach(function(b,i){b.setAttribute('data-tip',days[i]||label);});
      });
    }
    initSparklineTooltips();
    function fmtDate(iso) {
      if (!iso) return '\u2014';
      var lang = (window.I18n && I18n.getLang() === 'en') ? 'en-US' : 'it-IT';
      return new Date(iso).toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric' });
    }

    /* ── Safety net: force-reveal content after 6s regardless of async init ── */
    setTimeout(function(){
      var mp = document.querySelector('.main-panel');
      if (mp && mp.classList.contains('js-loading')) {
        console.warn('Forcing js-ready after timeout — async init may have stalled');
        mp.classList.remove('js-loading');
        mp.classList.add('js-ready');
      }
    }, 6000);

    /* ── Wait for Supabase ── */
    async function waitForSB() {
      var tries = 0;
      while (!window.sottotitoliSupabase && tries < 50) {
        await new Promise(function (r) { setTimeout(r, 100); });
        tries++;
      }
      return window.sottotitoliSupabase || null;
    }

    /* ── Main init ── */
    (async function () {
      // Word-bank Folders: render trigger registered EARLY (before the awaits below)
      // so clicking the English/Italiano subtabs always renders even if async init is still stalling.
      document.addEventListener('click', function (e) {
        var ft = e.target.closest ? e.target.closest('[data-subtab="wb-overview"], [data-subtab="wb-overview-it"]') : null;
        if (!ft) return;
        var lang = ft.getAttribute('data-subtab') === 'wb-overview-it' ? 'it' : 'en';
        var gridId = lang === 'it' ? 'wbFoldersGridIt' : 'wbFoldersGridEn';
        var tries = 0;
        (function tryRenderFolders() {
          if (window.renderWbFolders) { var g = document.getElementById(gridId); if (g) window.renderWbFolders(lang, g); return; }
          if (tries++ < 50) setTimeout(tryRenderFolders, 150);
        })();
      });

      var sb = await waitForSB();
      if (!sb) { console.warn('Supabase not loaded — rendering offline'); }
      // Always proceed with renders — never return early

      // Wait for auth to settle — poll getSession() instead of relying on events
      var meta = await SottotitoliData.getUserMeta();
      if (!meta) {
        console.warn('No session yet, polling for auth...');
        // Poll getSession() for up to 5 seconds (Supabase restores from localStorage async)
        for (var pollTries = 0; pollTries < 25; pollTries++) {
          await new Promise(function(r){ setTimeout(r, 200); });
          meta = await SottotitoliData.getUserMeta();
          if (meta) break;
        }
      }

      // ── Return-page redirect: after login, go back to invite link ──
      if (meta) {
        var returnPage = localStorage.getItem('sottotitoli_return_page');
        if (returnPage && returnPage.indexOf('duo-s8t.html') !== -1) {
          localStorage.removeItem('sottotitoli_return_page');
          window.location.replace(returnPage);
          return;
        }
      }

      // ── Load settings (works with OR without auth — falls back to localStorage) ──
      var settingsData = null;
      if (typeof SottotitoliData !== 'undefined' && SottotitoliData.loadSettings) {
        settingsData = await SottotitoliData.loadSettings();
      }
      window._settingsData = settingsData;
      // Apply saved theme immediately — a locally-picked wrapped theme wins over Supabase default
      var lsTheme = null; try { lsTheme = localStorage.getItem('sottotitoli-theme'); } catch(e){}
      if (lsTheme === 'modern' || lsTheme === 'modern-light' || lsTheme === 'genz' || lsTheme === 'genz-dark') {
        applyTheme(lsTheme);
      } else if (settingsData && settingsData.theme) {
        applyTheme(settingsData.theme);
      }

      // ── If not logged in, still render what we can ──
      if (!meta) {
        console.warn('No session — rendering offline mode');
        // Initialize empty data vars so render functions don't crash
        window._sottotitoliProfile = null;
        window.profile = null;
        window.statsEN = null; window.statsIT = null;
        window.refs = null; window.reports = []; window.tokens = 0; window.credits = null;
        window._sottotitoliPrefs = null;
        window.cefrBreakdown = null;
        // Fall through to render functions — do NOT return early
      } else {
        // Dropdown — set email immediately
        var ddEmail = document.getElementById('ddEmail');
        if (ddEmail) ddEmail.textContent = meta.email || '';

        // ── Load all data with error resilience ──
        try {
          window._sottotitoliProfile = await SottotitoliData.getProfile();
        } catch(e) { console.warn('getProfile failed:', e.message); window._sottotitoliProfile = null; }
        window.profile = window._sottotitoliProfile;
        try { window.statsEN = await SottotitoliData.getSessionStats('en'); } catch(e) { console.warn('statsEN failed:', e.message); window.statsEN = null; }
        try { window.statsIT = await SottotitoliData.getSessionStats('it'); } catch(e) { console.warn('statsIT failed:', e.message); window.statsIT = null; }
        try { window.refs = await SottotitoliData.getReferralStats(); } catch(e) { console.warn('refs failed:', e.message); window.refs = null; }
        try { window.reports = await SottotitoliData.getAIReports(); } catch(e) { console.warn('reports failed:', e.message); window.reports = []; }
        try { window.tokens = await SottotitoliData.getAITokens(); } catch(e) { console.warn('tokens failed:', e.message); window.tokens = 0; }
        try { window.credits = await SottotitoliData.getCredits(); } catch(e) { console.warn('credits failed:', e.message); window.credits = null; }
        try { window._sottotitoliPrefs = await SottotitoliData.getPreferences(); } catch(e) { console.warn('prefs failed:', e.message); window._sottotitoliPrefs = null; }
        try { window.cefrBreakdown = await SottotitoliData.getCEFRBreakdown(); } catch(e) { console.warn('cefr failed:', e.message); window.cefrBreakdown = null; }

        // ── Update dropdown with real data ──
        var ddName = document.getElementById('ddName');
        if (ddName) {
        ddName.textContent = (profile && profile.display_name) || (profile && profile.full_name) || (meta && meta.full_name) || (meta && meta.email ? meta.email.split('@')[0] : 'Utente');
      }
      var ddMinutes = document.getElementById('ddMinutes');
      if (ddMinutes) {
        ddMinutes.textContent = credits ? credits.balanceMinutes + ' min' : '—';
      }
      var ddTokens = document.getElementById('ddTokens');
      if (ddTokens) {
        ddTokens.textContent = tokens != null ? tokens : '—';
      }

      // Retry after delay in case session wasn't ready on first attempt
      setTimeout(async function(){
        var ddMin = document.getElementById('ddMinutes');
        var ddTok = document.getElementById('ddTokens');
        if (ddMin && ddMin.textContent === '—') {
          var c = await SottotitoliData.getCredits();
          if (c) ddMin.textContent = c.balanceMinutes + ' min';
        }
        if (ddTok && ddTok.textContent === '—') {
          var t = await SottotitoliData.getAITokens();
          if (t != null) ddTok.textContent = t;
        }
      }, 3000);

      // ── Update hero greeting text ──
      var heroText = document.getElementById('heroText');
      if (heroText && meta) {
        heroText.setAttribute('data-i18n', 'your_stats_ready');
        heroText.textContent = 'Le tue statistiche di apprendimento sono pronte.';
        if (typeof I18n !== 'undefined' && I18n.apply) { I18n.apply(heroText); }
      }

      // ── Save Profilo Linguistico ──
      async function saveProfiloLinguistico() {
        var btn = document.getElementById('saveProfileLingBtn');
        var msg = document.getElementById('savedProfileLingMsg');
        if (btn) { btn.disabled = true; btn.textContent = 'Salvataggio…'; }
        try {
          // Collect all selected values
          function getSelected(containerId) {
            var el = document.getElementById(containerId);
            if (!el) return null;
            var active = el.querySelector('.q-chip.active, .q-chip[aria-pressed="true"]');
            return active ? active.getAttribute('data-val') : null;
          }
          function getMultiSelected(containerId) {
            var el = document.getElementById(containerId);
            if (!el) return [];
            var chips = el.querySelectorAll('.q-chip.active, .q-chip[aria-pressed="true"]');
            return Array.from(chips).map(function(c) { return c.getAttribute('data-val'); });
          }
          var profile = {
            native_proficiency: getSelected('nativeProficiency'),
            native_contexts: getMultiSelected('nativeContexts'),
            native_improve: getMultiSelected('nativeImprove'),
            native_goals: document.getElementById('nativeGoalsInput')?.value?.trim() || null,
            target_purpose: getSelected('targetPurpose'),
            target_situations: getMultiSelected('targetSituations'),
            target_sector: getSelected('targetSector'),
            target_level: getSelected('targetLevel'),
            goal_primary: document.getElementById('targetGoalInput')?.value?.trim() || null
          };
          // Save to Supabase
          var sb = window.sottotitoliSupabase;
          if (sb) {
            var r = await sb.auth.getSession();
            if (r.data?.session) {
              var uid = r.data.session.user.id;
              await sb.from('profiles').upsert({ id: uid, ...profile }, { onConflict: 'id' });
              // ═══ Also sync to review_user_learning_profile (feeds Smart banks) ═══
              try {
                await sb.from('review_user_learning_profile').upsert({
                  user_id: uid,
                  target_language: window.SOTTOTITOLI_STUDY_LANG || 'en',
                  long_term_goal: profile.goal_primary || null,
                  target_role: profile.target_purpose || null,
                  target_domain: profile.target_sector || null,
                  target_contexts: profile.target_situations || [],
                  preferences: profile,
                  updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });
              } catch(lpErr) { console.warn('learning profile sync:', lpErr.message); }
              // ═══ Populate Smart bank suggestions via new SMART_SUGGESTIONS module ═══
              try {
                if (window.SMART_SUGGESTIONS && window.SMART_SUGGESTIONS.refreshAll) {
                  window.SMART_SUGGESTIONS.refreshAll(window.SOTTOTITOLI_STUDY_LANG || 'en');
                }
              } catch(gsErr) { console.warn('smart suggestions:', gsErr.message); }
            }
          }
          // Update local cache
          window._sottotitoliProfile = window._sottotitoliProfile || {};
          Object.assign(window._sottotitoliProfile, profile);
          // Show success
          if (msg) { msg.style.display = 'inline'; setTimeout(function() { msg.style.display = 'none'; }, 2500); }
          // Toast
          var t = document.createElement('div');
          t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--green);color:#fff;font-size:13px;font-weight:700;padding:10px 24px;border-radius:99px;z-index:99999;opacity:0;transition:opacity .3s;pointer-events:none;font-family:var(--font-body)';
          t.textContent = '✓ Profilo salvato';
          document.body.appendChild(t);
          requestAnimationFrame(function(){ t.style.opacity = '1'; });
          setTimeout(function(){ t.style.opacity = '0'; setTimeout(function(){ t.remove(); }, 300); }, 2000);
        } catch(e) {
          console.warn('saveProfile:', e);
          var t = document.createElement('div');
          t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#dc2626;color:#fff;font-size:13px;font-weight:700;padding:10px 24px;border-radius:99px;z-index:99999;opacity:0;transition:opacity .3s;pointer-events:none;font-family:var(--font-body)';
          t.textContent = '⚠ Errore: ' + (e.message || 'riprova');
          document.body.appendChild(t);
          requestAnimationFrame(function(){ t.style.opacity = '1'; });
          setTimeout(function(){ t.style.opacity = '0'; setTimeout(function(){ t.remove(); }, 300); }, 3000);
        }
        if (btn) { btn.disabled = false; btn.textContent = 'Salva profilo'; }
      }
      // Expose globally since onclick calls it
      window.saveProfiloLinguistico = saveProfiloLinguistico;

      // ═══ Smart suggestions now handled by js/smart-suggestions.js ═══
      } // end else (auth block)

      // ── Pick current language stats ──
      function currentStats() {
        return (window.SOTTOTITOLI_STUDY_LANG || 'en') === 'en' ? statsEN : statsIT;
      }

      // ═══ RENDER: Panoramica CEFR breakdown ───
      function renderPanoramicaCEFR() {
        var container = document.getElementById('panoramicaCefrChart');
        if (!container) return;
        if (!cefrBreakdown || cefrBreakdown.total === 0) {
          container.innerHTML = '<p style="font-size:13px;color:var(--text-faint)">Completa alcune sessioni per vedere la distribuzione CEFR del tuo vocabolario.</p>';
          return;
        }
        var levels = [
          {k:'C2',v:cefrBreakdown.C2,c:'#8b5cf6'},
          {k:'C1',v:cefrBreakdown.C1,c:'var(--amber)'},
          {k:'B2',v:cefrBreakdown.B2,c:'var(--green)'},
          {k:'B1',v:cefrBreakdown.B1,c:'var(--teal-2)'},
          {k:'A2',v:cefrBreakdown.A2,c:'var(--teal)'},
          {k:'A1',v:cefrBreakdown.A1,c:'var(--blue)'}
        ];
        var maxVal = Math.max.apply(null, levels.map(function(l){return l.v;})) || 1;
        var html = '<div style="display:flex;flex-direction:column;gap:6px">';
        levels.forEach(function(l) {
          var pct = Math.round(l.v / maxVal * 100);
          html += '<div style="display:flex;align-items:center;gap:10px">' +
            '<span style="width:28px;font-size:13px;font-weight:700;color:' + l.c + '">' + l.k + '</span>' +
            '<div style="flex:1;height:8px;border-radius:4px;background:var(--line);overflow:hidden">' +
            '<div style="height:100%;width:' + pct + '%;background:' + l.c + ';border-radius:4px;min-width:2px"></div></div>' +
            '<span style="font-size:13px;font-weight:600;color:var(--text-soft);min-width:44px">' + l.v + '</span></div>';
        });
        html += '<div style="font-size:11px;color:var(--text-faint);margin-top:4px">Vocabolario totale: <strong>' + cefrBreakdown.vocabSize + ' parole</strong> · MATTR: <strong>' + (cefrBreakdown.mattr > 0 ? cefrBreakdown.mattr.toFixed(3) : '—') + '</strong></div>';
        html += '</div>';
        container.innerHTML = html;
      }

      // ═══ RENDER: CEFR 4-box quad (Distribution + Count, All + Known) ═══
      var _cefrLang = 'en';
      var _cefrAllCache = {};
      async function renderCEFRQuad(lang) {
        lang = lang || _cefrLang || 'en';
        _cefrLang = lang;
        var levels = [
          {k:'C2',c:'#8b5cf6'},{k:'C1',c:'var(--amber)'},{k:'B2',c:'var(--green)'},
          {k:'B1',c:'var(--teal-2)'},{k:'A2',c:'var(--teal)'},{k:'A1',c:'var(--blue)'}
        ];

        var sb = window.sottotitoliSupabase;

        // ── All words — EN (session analytics) and IT (Italian word banks), cached ──
        async function cefrAllCounts(lang) {
          if (_cefrAllCache[lang]) return _cefrAllCache[lang];
          var counts = { A1:0, A2:0, B1:0, B2:0, C1:0, C2:0 }, total = 0;
          try {
            if (lang === 'en') {
              var allData = cefrBreakdown || {};
              counts = { A1:allData.A1||0, A2:allData.A2||0, B1:allData.B1||0, B2:allData.B2||0, C1:allData.C1||0, C2:allData.C2||0 };
              total = allData.total || 0;
            } else if (sb) {
              var r = await sb.auth.getSession();
              if (r.data && r.data.session) {
                var uid = r.data.session.user.id;
                var { data: itBanks } = await sb.from('user_wordbanks').select('id').eq('user_id', uid).eq('lang','it');
                var ids = (itBanks || []).map(function(b){ return b.id; });
                if (ids.length) {
                  var { data: itWords } = await sb.from('user_wordbank_words').select('cefr_level').in('wordbank_id', ids).limit(10000);
                  (itWords || []).forEach(function(w) {
                    var lvl = String(w.cefr_level||'').trim().toUpperCase();
                    if (counts.hasOwnProperty(lvl)) { counts[lvl]++; total++; }
                  });
                }
              }
            }
          } catch(e) {}
          _cefrAllCache[lang] = { counts: counts, total: total };
          return _cefrAllCache[lang];
        }
        var all = await cefrAllCounts(lang);
        var allCounts = all.counts, allTotal = all.total;

        // ── Known words (from review_words, mastered / high mastery, this lang) ──
        var knownCounts = { A1:0, A2:0, B1:0, B2:0, C1:0, C2:0 };
        var knownTotal = 0;
        try {
          if (sb) {
            var r2 = await sb.auth.getSession();
            if (r2.data && r2.data.session) {
              var q = sb.from('review_words')
                .select('cefr,mastery_score,review_state')
                .eq('user_id', r2.data.session.user.id)
                .or('review_state.eq.mastered,mastery_score.gte.80');
              if (lang === 'it') q = q.eq('lang','it');
              var { data: known } = await q.limit(1000);
              if (known) {
                known.forEach(function(w) {
                  var lvl = w.cefr;
                  if (lvl && knownCounts.hasOwnProperty(lvl)) { knownCounts[lvl]++; knownTotal++; }
                });
              }
            }
          }
        } catch(e) { /* known data unavailable */ }

        // ── Render: horizontal bars — width proportional to the TOTAL (bars add up to one full bar) ──
        function renderBars(counts, total) {
          var html = '';
          levels.forEach(function(l) {
            var v = counts[l.k] || 0;
            var pct = total > 0 ? Math.round(v / total * 100) : 0;
            html += '<div class="wb-bar-row">'+
              '<span class="wb-bar-lvl" style="color:'+l.c+'">'+l.k+'</span>'+
              '<div class="wb-bar-track"><div class="wb-bar-fill" style="width:'+pct+'%;background:'+l.c+';min-width:2px"></div></div>'+
              '<span class="wb-bar-val">'+v+'</span></div>';
          });
          return html;
        }

        // ── Render: count chips (reference design style) ──
        function renderCounts(counts, total) {
          var html = '';
          levels.forEach(function(l) {
            html += '<div class="wb-chip-box">'+
              '<div class="wb-chip-num" style="color:'+l.c+'">'+(counts[l.k]||0)+'</div>'+
              '<div class="wb-chip-lvl">'+l.k+'</div></div>';
          });
          return html;
        }

        // ── Toggle UI ──
        document.querySelectorAll('.wb-cefr-lang-btn').forEach(function(b){
          var on = b.getAttribute('data-cefr-lang') === lang;
          b.classList.toggle('active', on);
          b.style.background = on ? 'var(--cyan)' : 'transparent';
          b.style.color = on ? '#fff' : 'var(--text-soft)';
        });

        // ── Card 1: Distribution bar chart — all words (full width) ──
        var distAllEl = document.getElementById('wbCefrDistAll');
        var distAllTotalEl = document.getElementById('wbCefrDistAllTotal');
        var calcNoteEl = document.getElementById('wbCefrCalcNote');
        if (distAllEl) distAllEl.innerHTML = allTotal > 0 ? renderBars(allCounts, allTotal) : '<span style="font-size:13px;color:var(--text-faint)">'+(lang==='it'?'Nessuna parola nelle banche italiane.':'Nessun dato — completa alcune sessioni.')+'</span>';
        if (distAllTotalEl) distAllTotalEl.textContent = allTotal > 0 ? 'Totale: '+allTotal+' parole' : '';
        if (calcNoteEl) calcNoteEl.textContent = allTotal > 0
          ? (lang==='it' ? 'Basato sulle parole delle tue banche italiane · barre proporzionali al totale (sommano al 100%)'
                         : 'Basato sul vocabolario delle tue sessioni analizzate · barre proporzionali al totale (sommano al 100%)')
          : '';

        // ── Card 2: Count chips — English box + Italian box (always both) ──
        var countAllEl = document.getElementById('wbCefrCountAll');
        var countAllTotalEl = document.getElementById('wbCefrCountAllTotal');
        var enAll = await cefrAllCounts('en');
        if (countAllEl) countAllEl.innerHTML = enAll.total > 0 ? renderCounts(enAll.counts, enAll.total) : '<span style="font-size:13px;color:var(--text-faint);padding:8px 0">—</span>';
        if (countAllTotalEl) countAllTotalEl.textContent = enAll.total > 0 ? 'Totale: '+enAll.total+' parole' : '';
        var itAll = await cefrAllCounts('it');
        var countAllItEl = document.getElementById('wbCefrCountAllIt');
        if (countAllItEl) countAllItEl.innerHTML = itAll.total > 0 ? renderCounts(itAll.counts, itAll.total) : '<span style="font-size:13px;color:var(--text-faint);padding:8px 0">—</span>';

        // ── Card 3: Distribution — known words ──
        var distKnownEl = document.getElementById('wbCefrDistKnown');
        if (distKnownEl) {
          if (knownTotal > 0) {
            distKnownEl.innerHTML = renderBars(knownCounts, knownTotal);
            distKnownEl.style.cssText = 'display:flex;flex-direction:column;gap:12px;flex:1;justify-content:center';
          } else {
            distKnownEl.innerHTML = '<div class="wb-empty"><span class="material-symbols-outlined wb-empty-icon">psychology_alt</span><p class="wb-empty-text">Nessuna parola confermata. Usa il Trainer per consolidare le parole.</p></div>';
            distKnownEl.style.cssText = 'flex:1';
          }
        }

        // ── Card 4: Count chips — known words ──
        var countKnownEl = document.getElementById('wbCefrCountKnown');
        var countKnownTotalEl = document.getElementById('wbCefrCountKnownTotal');
        if (countKnownEl) {
          if (knownTotal > 0) {
            countKnownEl.innerHTML = renderCounts(knownCounts, knownTotal);
            countKnownEl.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;flex:1;align-content:flex-start';
          } else {
            countKnownEl.innerHTML = '<div class="wb-chip-box"><div class="wb-chip-num" style="color:rgba(224,230,230,.25)">0</div><div class="wb-chip-lvl">C2</div></div><div class="wb-chip-box"><div class="wb-chip-num" style="color:rgba(224,230,230,.25)">0</div><div class="wb-chip-lvl">C1</div></div><div class="wb-chip-box"><div class="wb-chip-num" style="color:rgba(224,230,230,.25)">0</div><div class="wb-chip-lvl">B2</div></div><div class="wb-chip-box"><div class="wb-chip-num" style="color:rgba(224,230,230,.25)">0</div><div class="wb-chip-lvl">B1</div></div><div class="wb-chip-box"><div class="wb-chip-num" style="color:rgba(224,230,230,.25)">0</div><div class="wb-chip-lvl">A2</div></div><div class="wb-chip-box"><div class="wb-chip-num" style="color:rgba(224,230,230,.25)">0</div><div class="wb-chip-lvl">A1</div></div>';
            countKnownEl.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;flex:1;align-content:flex-start;opacity:.3;filter:grayscale(1)';
          }
          if (countKnownTotalEl) countKnownTotalEl.textContent = knownTotal > 0 ? 'Totale: '+knownTotal+' parole' : 'Trainer inattivo';
        }
      }
      window.renderCEFRQuad = renderCEFRQuad;
      // Toggle the CEFR card between English and Italian collections.
      window.setCefrLang = function(lang) { renderCEFRQuad(lang); };

      // ── Shared favourites helpers (Word-banks Overview + Vocabulary Builder Overview) ──
      var SYSTEM_BANK_META = {
        review_due_now:     { name:'Ripasso immediato', sub:'Parole da ripassare ora o in ritardo' },
        saved_from_sessions:{ name:'Saved From Sessions', sub:'Words you saved during live sessions' },
        vocab_builder_en:  { name:'English Vocabulary Builder', sub:'Words saved from Vocabulary Builder search' },
        fragile_words:     { name:'Fragile Words', sub:'Weak words at risk of being forgotten' },
        goal_next_step:     { name:'Next Step For Your Goal', sub:'Goal-aligned vocabulary for your profile' },
        build_from_known:  { name:'Build From What You Know', sub:'Higher-level replacements for words you know' },
        activate_recognized:{ name:'Activate What You Recognize', sub:'Passive vocabulary — words seen but not claimed' },
        upcoming_useful_vocab:{ name:'Goal-Based Upcoming Vocab', sub:'Words for your declared short-term goals' },
        upcoming_session_driven:{ name:'Session-Detected Themes', sub:'Predicted needs from your recent session topics' },
        upcoming_roadmap:  { name:'Your Learning Roadmap', sub:'Staged vocabulary for your goal journey' }
      };
      // Resolve favourited bank ids → [{b, lang, system?}] (real banks + system collections).
      async function resolveFavBanks() {
        var favEn = []; try { favEn = JSON.parse(localStorage.getItem('sottotitoli-fav-banks') || '[]'); } catch(e) {}
        var favIt = []; try { favIt = JSON.parse(localStorage.getItem('sottotitoli-fav-banks-it') || '[]'); } catch(e) {}
        var out = [];
        try {
          if (window.SottotitoliData && window.SottotitoliData.getWordbanks) {
            var banks = (await window.SottotitoliData.getWordbanks('en')) || [];
            banks.forEach(function(b){ if (favEn.indexOf(b.id) >= 0) out.push({ b:b, lang:'en' }); });
            var itBanks = []; try { itBanks = (await window.SottotitoliData.getWordbanks('it')) || []; } catch(e) {}
            itBanks.forEach(function(b){ if (favIt.indexOf(b.id) >= 0) out.push({ b:b, lang:'it' }); });
          }
        } catch(e) {}
        favEn.forEach(function(id){ var m = SYSTEM_BANK_META[id]; if (m) out.push({ b:{ id:id, name:m.name, sub:m.sub, word_count:null }, lang:'en', system:true }); });
        favIt.forEach(function(id){ var m = SYSTEM_BANK_META[id]; if (m) out.push({ b:{ id:id, name:m.name, sub:m.sub, word_count:null }, lang:'it', system:true }); });
        var seen = {};
        return out.filter(function(f){ var k = f.system ? ('sys:'+f.b.id) : ('bank:'+f.b.id+':'+f.lang); if (seen[k]) return false; return (seen[k] = true); });
      }
      window.resolveFavBanks = resolveFavBanks;
      // Pin-card markup for a resolved favourite (shared by both favourites boxes).
      function favPinHtml(f, i) {
        var b = f.b;
        var c = ['#5de6ff','#d97706','#059669','#ef4444','#8b5cf6','#0891b2'][i % 6];
        var openFn = "wbOpenFav('" + b.id + "','" + (f.lang || 'en') + "'," + (f.system ? 'true' : 'false') + ")";
        var favT = (window.I18n && window.I18n.t) ? window.I18n.t('wb_folders_unfav') : 'Remove from favorites';
        var subHtml = (b.word_count != null)
          ? '<div class="wb-pin-sub">'+(b.word_count||0)+' words</div>'
          : (b.sub ? '<div class="wb-pin-sub">'+b.sub+'</div>' : '');
        return '<div class="wb-glass wb-pin-card" onclick="'+openFn+'(\''+b.id+'\')">'+
          '<button type="button" class="wb-pin-star on" data-bank="'+b.id+'" data-lang="'+f.lang+'" title="'+favT+'" onclick="event.stopPropagation();toggleWbFav(this)"><span class="material-symbols-outlined">star</span></button>'+
          '<div class="wb-pin-name">'+(b.name||'Bank')+'</div>'+
          subHtml+
        '</div>';
      }

      // ── Render: Word Banks Overview (Favorites + Library) ──
      async function renderWbOverviewSections() {
        // Favorite Collections
        var pinnedGrid = document.getElementById('wbPinnedGrid');
        if (!pinnedGrid) return;
        updateWbVsBoxes();
        renderChartBox('wb');
        
        // Resolve favourites: real user banks + pinned/smart system collections
        var favBanks = await resolveFavBanks();
        var favCount = 0;
        try { favCount = JSON.parse(localStorage.getItem('sottotitoli-fav-banks') || '[]').length + JSON.parse(localStorage.getItem('sottotitoli-fav-banks-it') || '[]').length; } catch(e) {}

        if (favBanks.length === 0) {
          pinnedGrid.innerHTML = (favCount > 0)
            ? '<div class="wb-pin-card" style="grid-column:1/-1;text-align:center;padding:24px;color:rgba(224,230,230,.4)"><span class="material-symbols-outlined" style="font-size:36px;margin-bottom:8px;display:block;opacity:.3">wifi_off</span><p style="font-size:13px;margin:0">Accedi per visualizzare le tue collezioni.</p></div>'
            : '<div class="wb-pin-card" style="grid-column:1/-1;text-align:center;padding:24px;color:rgba(224,230,230,.4)"><span class="material-symbols-outlined" style="font-size:36px;margin-bottom:8px;display:block;opacity:.3">star</span><p style="font-size:13px;margin:0">No favorites yet. Click the ★ icon on any word bank to add it here.</p></div>';
        } else {
          pinnedGrid.innerHTML = favBanks.map(favPinHtml).join('');
        }

        // Full Library
        var libEl = document.getElementById('wbFullLibrary');
        if (!libEl) return;
        try {
          var libSb = window.sottotitoliSupabase;
          if (!libSb) {
            libEl.innerHTML = '<div class="wb-lib-row" style="justify-content:center"><span class="wb-lib-count">Accedi per visualizzare le tue sessioni.</span></div>';
            return;
          }
          var ar = await libSb.auth.getSession();
          if (!ar.data || !ar.data.session) {
            libEl.innerHTML = '<div class="wb-lib-row" style="justify-content:center"><span class="wb-lib-count">Accedi per visualizzare le tue sessioni.</span></div>';
            return;
          }
          var { data: recent } = await libSb.from('sessions')
            .select('id,name,started_at,duration_seconds,words_count,language_pair,lexical_diversity')
            .eq('user_id', ar.data.session.user.id)
            .order('started_at', { ascending: false })
            .limit(7);
          var sessions = (recent || []).filter(function(s){ return (s.duration_seconds||0) > 0 || (s.words_count||0) > 0; });
          if (!sessions.length) {
            libEl.innerHTML = '<div class="wb-lib-row" style="justify-content:center"><span class="wb-lib-count">Nessuna sessione ancora. Avvia la prima.</span></div>';
          } else {
            libEl.innerHTML = sessions.map(function(s){
              var isIt = /it/i.test(s.language_pair || '');
              var flag = isIt ? '🇮🇹' : '🇬🇧';
              var words = s.words_count || 0;
              var lex = s.lexical_diversity || 0;
              var unique = lex > 0 ? Math.round(words * lex) : '—';
              var d = s.started_at ? new Date(s.started_at) : null;
              var label = (s.name && String(s.name).trim()) ? String(s.name).trim() : (d ? d.toLocaleDateString('it-IT',{day:'2-digit',month:'short'}) : 'Sessione');
              var mins = Math.max(1, Math.round((s.duration_seconds||0)/60));
              var openFn = "var n=document.querySelector('[data-panel=trascrizioni]');if(n)n.click();setTimeout(function(){if(window.trOpenEditor)trOpenEditor('"+s.id+"')},400)";
              return '<div class="wb-lib-row wb-lib-divider" onclick="'+openFn+'">'+
                '<div style="display:flex;align-items:center;gap:12px;min-width:0">'+
                  '<span style="font-size:15px;line-height:1">'+flag+'</span>'+
                  '<span class="wb-lib-name" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+escHtml(label)+'</span>'+
                '</div>'+
                '<div style="display:flex;gap:14px;align-items:center;flex-shrink:0">'+
                  '<span class="wb-lib-count" title="Parole totali">'+words+' <span style="opacity:.6">parole</span></span>'+
                  '<span class="wb-lib-count" title="Parole uniche">'+unique+' <span style="opacity:.6">uniche</span></span>'+
                  '<span class="wb-lib-count" title="Diversità lessicale">'+(lex>0?lex.toFixed(2):'—')+' <span style="opacity:.6">lex</span></span>'+
                  '<span style="width:1px;height:14px;background:var(--line)"></span>'+
                  '<span class="wb-lib-count">'+mins+' <span style="opacity:.6">min</span></span>'+
                '</div>'+
              '</div>';
            }).join('');
          }
        } catch(e) {
          libEl.innerHTML = '<div class="wb-lib-row" style="justify-content:center"><span class="wb-lib-count">Unable to load sessions. Try refreshing.</span></div>';
        }
      }
      window.renderWbOverviewSections = renderWbOverviewSections;

      // Switch to a Vocabulary Builder subtab (used by the Overview CTAs).
      window.vbGoTab = function(id) {
        var b = document.querySelector('#pnl-vocabulary-builder [data-subtab="'+id+'"]');
        if (b) b.click();
      };

  // ═══════════════════════════════════════
  // Component 4: Word Banks By Topic Filter
  // ═══════════════════════════════════════
  var _bankTopicFilter = 'all';

  function filterBanksByTopic(btn, topic) {
    _bankTopicFilter = topic || 'all';
    if (btn) {
      var bar = btn.closest('.wbx-toggle-bar, div');
      if (bar) bar.querySelectorAll('[data-bank-topic]').forEach(function(c){ c.classList.remove('active'); });
      btn.classList.add('active');
    }
    // Re-render word banks if function exists
    if (typeof renderTranslationBanks === 'function') renderTranslationBanks();
    if (typeof renderItalianBanks === 'function') renderItalianBanks();
  }

  window.filterBanksByTopic = filterBanksByTopic;


      // ═══ RENDER: Panoramica hero ───

      // ── Confidence state builder ──
      function getInsightState() {
        var s = currentStats() || {};
        var totalSessions = s.totalSessions || 0;
        var totalMinutes = s.totalMinutes || 0;
        if (totalSessions === 0) return { key: 'no_data', confidence: 'Bassa' };
        if (totalSessions < 5 || totalMinutes < 30) return { key: 'early_data', confidence: 'Bassa' };
        if (totalSessions < 20 || totalMinutes < 180) return { key: 'growing_data', confidence: 'Media' };
        return { key: 'solid_data', confidence: 'Alta' };
      }

      // ── Fetch 60-day session history for habit + growth computation ──
      async function fetchRecentSessionsForHero() {
        var sb = window.sottotitoliSupabase;
        if (!sb) return [];
        var r = await sb.auth.getSession();
        if (!r.data || !r.data.session) return [];
        var userId = r.data.session.user.id;
        var lang = window.SOTTOTITOLI_STUDY_LANG || 'en';
        var start = new Date();
        start.setDate(start.getDate() - 60);
        var { data, error } = await sb
          .from('sessions')
          .select('duration_seconds,words_count,wpm,lexical_diversity,started_at')
          .eq('user_id', userId)
          .like('language_pair', lang + '%')
          .gte('started_at', start.toISOString())
          .order('started_at', { ascending: false });
        if (error) return [];
        return data || [];
      }

      // ── Compute practice habits from raw sessions ──
      function computePracticeHabit(sessions) {
        if (!sessions || !sessions.length) {
          return { activeDays: 0, dailyAverageMinutes: 0, preferredTimeBucket: null, topDays: [], sessionsPerWeek: 0 };
        }
        var dayMap = new Map();
        var weekdayCount = [0,0,0,0,0,0,0];
        var timeBuckets = { mattina: 0, pomeriggio: 0, sera: 0, notte: 0 };
        sessions.forEach(function(s) {
          var dt = new Date(s.started_at);
          var isoDay = dt.toISOString().slice(0, 10);
          var mins = Math.max(1, Math.round((s.duration_seconds || 0) / 60));
          dayMap.set(isoDay, (dayMap.get(isoDay) || 0) + mins);
          weekdayCount[dt.getDay()] += 1;
          var h = dt.getHours();
          if (h >= 6 && h < 12) timeBuckets.mattina += 1;
          else if (h >= 12 && h < 18) timeBuckets.pomeriggio += 1;
          else if (h >= 18 && h < 24) timeBuckets.sera += 1;
          else timeBuckets.notte += 1;
        });
        var activeDays = dayMap.size;
        var totalMinutes = 0;
        dayMap.forEach(function(v) { totalMinutes += v; });
        var dailyAverageMinutes = activeDays ? Math.round(totalMinutes / activeDays) : 0;
        var dayNames = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
        var sortedDays = weekdayCount.map(function(count, idx) { return { day: dayNames[idx], count: count }; })
          .sort(function(a, b) { return b.count - a.count; })
          .filter(function(x) { return x.count > 0; });
        var prefEntries = Object.entries(timeBuckets).sort(function(a, b) { return b[1] - a[1]; });
        var preferredTimeBucket = prefEntries.length ? prefEntries[0][0] : null;
        var timeLabels = { mattina: 'la mattina', pomeriggio: 'il pomeriggio', sera: 'la sera', notte: 'la notte' };
        var sessionsPerWeek = Math.max(1, Math.round((sessions.length / Math.max(activeDays, 7)) * 7));
        return {
          activeDays: activeDays,
          dailyAverageMinutes: dailyAverageMinutes,
          preferredTimeBucket: preferredTimeBucket,
          preferredTimeLabel: timeLabels[preferredTimeBucket] || '',
          topDays: sortedDays.slice(0, 2).map(function(d) { return d.day; }),
          sessionsPerWeek: sessionsPerWeek
        };
      }

      // ── Compute month-over-month growth ──
      function computeMonthlyGrowth(sessions) {
        var now = new Date();
        var last30 = [];
        var prev30 = [];
        sessions.forEach(function(s) {
          var dt = new Date(s.started_at);
          var diffDays = (now - dt) / 86400000;
          if (diffDays <= 30) last30.push(s);
          else if (diffDays <= 60) prev30.push(s);
        });
        function avg(arr) {
          if (!arr.length) return { wpm: 0, minutes: 0 };
          var wpmVals = arr.map(function(x) { return Number(x.wpm || 0); }).filter(Boolean);
          var minsVals = arr.map(function(x) { return Math.max(1, Math.round((x.duration_seconds || 0) / 60)); });
          return {
            wpm: wpmVals.length ? wpmVals.reduce(function(a,b){return a+b;},0) / wpmVals.length : 0,
            minutes: minsVals.length ? minsVals.reduce(function(a,b){return a+b;},0) / minsVals.length : 0
          };
        }
        var a = avg(last30);
        var b = avg(prev30);
        function pct(curr, prev) {
          if (!prev && !curr) return 0;
          if (!prev) return 100;
          return ((curr - prev) / prev) * 100;
        }
        return {
          monthlyWpmGrowthPct: Math.round(pct(a.wpm, b.wpm)),
          monthlyMinutesGrowthPct: Math.round(pct(a.minutes, b.minutes))
        };
      }

      // ── Navigate to Learning Strategy (under Grammar Hub) ──
      function openInsightsOverview() {
        var nav = document.querySelector('[data-panel="grammar-hub"]');
        if (nav) nav.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        setTimeout(function() {
          var tab = document.querySelector('[data-subtab="gh-strategy"]');
          if (tab) tab.click();
        }, 120);
      }
      window.openInsightsOverview = openInsightsOverview;

      // ── Profilo Linguistico modal ──
      // ── Modal chip click: toggle in modal AND sync to original ──
      document.addEventListener('click', function(e) {
        var chip = e.target.closest('#modalProfileLingContent .q-chip');
        if (!chip) return;
        e.preventDefault();
        var container = chip.closest('[id]');
        if (!container) return;
        var isMulti = container.classList.contains('q-multi');
        if (!isMulti) {
          container.querySelectorAll('.q-chip').forEach(function(c){ c.classList.remove('active'); c.setAttribute('aria-pressed','false'); });
        }
        chip.classList.toggle('active');
        chip.setAttribute('aria-pressed', chip.classList.contains('active') ? 'true' : 'false');
        // Sync to original
        var origContainer = document.getElementById(container.id);
        if (origContainer) {
          if (!isMulti) origContainer.querySelectorAll('.q-chip').forEach(function(c){ c.classList.remove('active'); c.setAttribute('aria-pressed','false'); });
          var val = chip.getAttribute('data-val');
          var origChip = origContainer.querySelector('.q-chip[data-val="' + val + '"]');
          if (origChip) {
            origChip.classList.toggle('active');
            origChip.setAttribute('aria-pressed', chip.classList.contains('active') ? 'true' : 'false');
          }
        }
      });

      // ── Modal input sync on blur ──
      document.addEventListener('blur', function(e) {
        var inp = e.target.closest('#modalProfileLingContent input');
        if (!inp) return;
        var orig = document.getElementById(inp.id);
        if (orig) orig.value = inp.value;
      }, true);

      // ═══ DYNAMIC DASHBOARD MESSAGE ENGINE ═══
      function computeDashboardMetrics() {
        var s = currentStats() || {};
        var allSessions = (s && s._allSessions) || [];
        var now = new Date();
        var weekAgo = new Date(now.getTime() - 7*24*60*60*1000);
        var twoWeeksAgo = new Date(now.getTime() - 14*24*60*60*1000);
        var thirtyDaysAgo = new Date(now.getTime() - 30*24*60*60*1000);

        // Sessions in various windows
        var sessions7d = allSessions.filter(function(s){ return new Date(s.started_at) >= weekAgo; });
        var sessions14d = allSessions.filter(function(s){ return new Date(s.started_at) >= twoWeeksAgo; });
        var sessions30d = allSessions.filter(function(s){ return new Date(s.started_at) >= thirtyDaysAgo; });

        // Active days (unique days with sessions)
        function uniqueDays(list) {
          var days = {};
          list.forEach(function(s){ var d = new Date(s.started_at).toDateString(); days[d] = true; });
          return Object.keys(days).length;
        }

        // Last active (days since most recent session)
        var lastActiveDays = 999;
        if (allSessions.length) {
          var latest = new Date(Math.max.apply(null, allSessions.map(function(s){ return new Date(s.started_at).getTime(); })));
          lastActiveDays = Math.floor((now.getTime() - latest.getTime()) / (24*60*60*1000));
        }

        // Streak from localStorage
        var streakDays = parseInt(localStorage.getItem('s8t-streak') || '0');

        // Consistency: active_days / days_in_window
        var activeDays7d = uniqueDays(sessions7d);
        var activeDays30d = uniqueDays(sessions30d);
        var consistencyScore = activeDays7d / 7;

        // Minutes this week
        var minutes7d = sessions7d.reduce(function(sum, s){ return sum + (s.duration_seconds || 0); }, 0) / 60;

        // Average session length
        var avgSessionMin = sessions7d.length ? Math.round(minutes7d / sessions7d.length) : 0;

        // Quality/accuracy (from session quality_score, if available)
        var qualityScores = sessions7d.filter(function(s){ return s.quality_score > 0; }).map(function(s){ return s.quality_score; });
        var accuracy7d = qualityScores.length ? Math.round(qualityScores.reduce(function(a,b){return a+b;},0) / qualityScores.length) : 0;

        // Accuracy delta 30d (compare first half of 30d vs second half)
        var first15 = sessions30d.filter(function(s){ return new Date(s.started_at) < new Date(now.getTime() - 15*24*60*60*1000); });
        var last15 = sessions30d.filter(function(s){ return new Date(s.started_at) >= new Date(now.getTime() - 15*24*60*60*1000); });
        var firstAvg = first15.filter(function(s){return s.quality_score>0;}).reduce(function(a,b){return a+b.quality_score;},0) / Math.max(1, first15.filter(function(s){return s.quality_score>0;}).length);
        var lastAvg = last15.filter(function(s){return s.quality_score>0;}).reduce(function(a,b){return a+b.quality_score;},0) / Math.max(1, last15.filter(function(s){return s.quality_score>0;}).length);
        var accuracyDelta30d = (lastAvg && firstAvg) ? Math.round((lastAvg - firstAvg) * 10) / 10 : 0;

        // Goal progress (from localStorage or user_preferences)
        var goalProgress = parseInt(localStorage.getItem('s8t-goal-progress') || '0');
        var weeklyGoalMet = localStorage.getItem('s8t-weekly-goal-met') === 'true';

        // Days since signup (approximate from first session or profile)
        var daysSinceSignup = 999;
        if (allSessions.length) {
          var first = new Date(Math.min.apply(null, allSessions.map(function(s){ return new Date(s.started_at).getTime(); })));
          daysSinceSignup = Math.floor((now.getTime() - first.getTime()) / (24*60*60*1000));
        }

        var sessionsTotal = (s && s.totalSessions) || 0;
        var newUser = sessionsTotal === 0;

        return {
          new_user: newUser,
          days_since_signup: daysSinceSignup,
          sessions_7d: sessions7d.length,
          sessions_14d: sessions14d.length,
          sessions_30d: sessions30d.length,
          sessions_total: sessionsTotal,
          active_days_7d: activeDays7d,
          active_days_30d: activeDays30d,
          streak_days: streakDays,
          minutes_7d: Math.round(minutes7d),
          avg_session_minutes: avgSessionMin,
          accuracy_7d: accuracy7d,
          accuracy_delta_30d: accuracyDelta30d,
          goal_progress: goalProgress,
          last_active_days: lastActiveDays,
          consistency_score: Math.round(consistencyScore * 100) / 100,
          returning_user: lastActiveDays >= 7,
          weekly_goal_met: weeklyGoalMet,
          // Unavailable yet — defaults
          corrections_7d: 0,
          mastered_items: 0,
          reviewed_feedback: false,
          insights_available: false,
          difficulty_delta: 0,
          error_delta_30d: 0,
          weak_topic_improvement: 0,
          weekly_goal_streak: 0,
          login_count: 1,
          tasks_completed: 0
        };
      }

      // ═══ Dashboard message rules — priority-ordered ═══
      // Load from localStorage overrides if available, else use hardcoded defaults
      function buildMessageRules() {
        try {
          var saved = JSON.parse(localStorage.getItem('dashboard-messages-overrides') || 'null');
          if (saved && Array.isArray(saved) && saved.length > 0) {
            return saved.map(function(r){
              return {p: r.p, k: r.k || '', f: new Function('m', 'return (' + r.f + ');'), t: r.t};
            });
          }
        } catch(e) { /* use defaults */ }
        // Hardcoded defaults — all have i18n keys (k:) for translation
        return [
        // ── Return / recovery (priority 100) ──
        {p:100, k:'dash_return_30d', f:function(m){return m.last_active_days>30;}, t:"You can restart without starting over."},
        {p:100, k:'dash_return_15d', f:function(m){return m.last_active_days>=15&&m.last_active_days<=30;}, t:"Your previous progress is still a useful foundation."},
        {p:100, k:'dash_return_7d', f:function(m){return m.last_active_days>=7&&m.last_active_days<=14;}, t:"Good to see you back. Start with one clear step."},
        {p:99, k:'dash_return_goal', f:function(m){return m.returning_user&&m.goal_progress<100;}, t:"Take a moment to reconnect with what you were learning."},
        {p:99, k:'dash_return_insights', f:function(m){return m.returning_user&&m.insights_available;}, t:"Your next session can turn reflection into progress."},

        // ── Streak milestones (priority 80-89) ──
        {p:89, k:'dash_streak_30_eq', f:function(m){return m.streak_days===30;}, t:"You are showing what steady progress looks like."},
        {p:88, k:'dash_streak_30', f:function(m){return m.streak_days>=30;}, t:"Your habit is now part of your learning system."},
        {p:87, k:'dash_streak_21', f:function(m){return m.streak_days===21;}, t:"Your discipline is doing useful work."},
        {p:86, k:'dash_streak_14', f:function(m){return m.streak_days===14;}, t:"You have created a routine with real momentum."},
        {p:85, k:'dash_streak_14b', f:function(m){return m.streak_days===14;}, t:"Two consistent weeks can change how learning feels."},
        {p:84, k:'dash_streak_10', f:function(m){return m.streak_days===10;}, t:"Your regular effort is becoming visible."},
        {p:83, k:'dash_streak_10b', f:function(m){return m.streak_days===10;}, t:"Ten consecutive days reflect deliberate practice."},
        {p:82, k:'dash_streak_7', f:function(m){return m.streak_days===7;}, t:"Your routine is beginning to carry you forward."},
        {p:81, k:'dash_streak_7b', f:function(m){return m.streak_days===7;}, t:"A full week of consistency is behind you."},
        {p:80, k:'dash_streak_5', f:function(m){return m.streak_days===5;}, t:"You are building a rhythm that can last."},
        {p:80, k:'dash_streak_5b', f:function(m){return m.streak_days===5;}, t:"Five focused days show real commitment."},
        {p:79, k:'dash_streak_3', f:function(m){return m.streak_days===3;}, t:"Your consistency is becoming a strength."},
        {p:79, k:'dash_streak_3b', f:function(m){return m.streak_days===3;}, t:"Three days in a row is a meaningful start."},
        {p:78, k:'dash_streak_8plus', f:function(m){return m.streak_days>=8;}, t:"Keep protecting the rhythm you have created."},

        // ── High consistency (priority 75) ──
        {p:75, k:'dash_consistency_high', f:function(m){return m.consistency_score>=0.85;}, t:"Your strongest advantage is consistency."},
        {p:75, k:'dash_consistency_short', f:function(m){return m.consistency_score>=0.8&&m.minutes_7d<60;}, t:"Your routine is reliable, even when sessions are short."},
        {p:74, k:'dash_active_30d', f:function(m){return m.active_days_30d>=20;}, t:"Regular practice is giving your progress structure."},
        {p:74, k:'dash_active_7d', f:function(m){return m.active_days_7d>=5;}, t:"You are returning often enough to retain momentum."},
        {p:73, k:'dash_short_sessions', f:function(m){return m.sessions_7d>=5&&m.avg_session_minutes<15;}, t:"You do not need long sessions to make steady progress."},

        // ── Goal progress (priority 70) ──
        {p:70, k:'dash_goal_90', f:function(m){return m.goal_progress>=90&&m.goal_progress<100;}, t:"One more focused step could complete this goal."},
        {p:70, k:'dash_goal_90b', f:function(m){return m.goal_progress>=90&&m.goal_progress<100;}, t:"The finish line is now clearly visible."},
        {p:69, k:'dash_goal_80', f:function(m){return m.goal_progress>=80;}, t:"You are close enough to finish with intention."},
        {p:69, k:'dash_goal_75', f:function(m){return m.goal_progress>=75&&m.goal_progress<=89;}, t:"Your goal is becoming a completed plan."},
        {p:68, k:'dash_goal_50', f:function(m){return m.goal_progress>=50&&m.goal_progress<=74;}, t:"Your next milestone is within reach."},
        {p:68, k:'dash_goal_50b', f:function(m){return m.goal_progress===50;}, t:"You are more than halfway there."},
        {p:67, k:'dash_weekly_done', f:function(m){return m.weekly_goal_met;}, t:"Your weekly goal is complete. Keep the momentum useful."},
        {p:67, k:'dash_weekly_done2', f:function(m){return m.weekly_goal_met;}, t:"You followed through on this week\'s plan."},

        // ── Improvement (priority 65) ──
        {p:65, k:'dash_improve_strong', f:function(m){return m.accuracy_delta_30d>=10&&m.sessions_30d>=8;}, t:"You have evidence that your method is working."},
        {p:65, k:'dash_improve_gains', f:function(m){return m.accuracy_delta_30d>=5&&m.sessions_30d>=5;}, t:"Your recent practice is producing measurable gains."},
        {p:64, k:'dash_improve_5', f:function(m){return m.accuracy_delta_30d>=5;}, t:"Your recent results show clear improvement."},
        {p:64, k:'dash_improve_positive', f:function(m){return m.accuracy_delta_30d>0;}, t:"Your accuracy is moving in the right direction."},
        {p:63, k:'dash_accuracy_high', f:function(m){return m.accuracy_7d>=85&&m.consistency_score>=0.7;}, t:"Your strengths are becoming more consistent."},
        {p:63, k:'dash_accuracy_80', f:function(m){return m.accuracy_7d>=80&&m.sessions_7d>=3;}, t:"Your latest sessions show useful control."},

        // ── Early progress (priority 40-50) ──
        {p:50, k:'dash_routine', f:function(m){return m.consistency_score>=0.6;}, t:"Your learning is moving from effort to routine."},
        {p:49, k:'dash_rhythm', f:function(m){return m.active_days_7d>=3&&m.sessions_7d>=4;}, t:"Your learning rhythm is taking shape."},
        {p:48, k:'dash_momentum', f:function(m){return m.sessions_7d>=3;}, t:"Your recent activity shows useful momentum."},
        {p:47, k:'dash_base_7', f:function(m){return m.sessions_total>=7;}, t:"You are creating a reliable base."},
        {p:46, k:'dash_base_5', f:function(m){return m.sessions_total>=5;}, t:"You have moved beyond the starting point."},
        {p:45, k:'dash_adding_up', f:function(m){return m.sessions_total>=3;}, t:"Small efforts are beginning to add up."},
        {p:44, k:'dash_momentum_start', f:function(m){return m.sessions_total>=2&&m.sessions_total<=3;}, t:"You have started building momentum."},
        {p:43, k:'dash_pattern', f:function(m){return m.sessions_total>=2;}, t:"Your first steps are becoming a pattern."},
        {p:42, k:'dash_intention', f:function(m){return m.sessions_total>=1;}, t:"You are turning intention into action."},
        {p:41, k:'dash_second_session', f:function(m){return m.sessions_total===2;}, t:"Consistency begins with returning once more."},

        // ── New user (priority 20) ──
        {p:20, k:'dash_new_7d', f:function(m){return m.new_user&&m.days_since_signup<=7;}, t:"Your first step is already within reach."},
        {p:20, k:'dash_new_small', f:function(m){return m.new_user;}, t:"Start small. Build something lasting."},
        {p:19, k:'dash_new_journey', f:function(m){return m.new_user&&m.sessions_total===0;}, t:"Your learning journey starts here."},
        {p:19, k:'dash_new_first', f:function(m){return m.sessions_total===0;}, t:"A strong start begins with one focused session."},
        {p:18, k:'dash_new_momentum', f:function(m){return m.sessions_total===0;}, t:"One session is enough to create momentum."},
        {p:18, k:'dash_new_moment', f:function(m){return m.sessions_total===0&&m.minutes_7d===0;}, t:"Give yourself one focused moment today."},
        {p:17, k:'dash_new_step', f:function(m){return m.new_user&&m.sessions_total===0;}, t:"Make today your first meaningful step."},
        {p:17, k:'dash_new_curiosity', f:function(m){return m.new_user;}, t:"Begin with curiosity, not pressure."},
        {p:16, k:'dash_new_showing_up', f:function(m){return m.sessions_total===0;}, t:"Progress starts with showing up."},
        {p:16, k:'dash_new_starting', f:function(m){return m.sessions_total===0;}, t:"Your progress has a simple starting point: today."}
        ];
      }

      var DASHBOARD_MESSAGES = buildMessageRules();

      function chooseDashboardMessage(metrics) {
        // Filter rules whose conditions match, sort by priority descending
        var matches = DASHBOARD_MESSAGES.filter(function(r){ return r.f(metrics); });
        matches.sort(function(a, b){ return b.p - a.p; });
        if (matches.length) return matches[0];

        // Default fallback
        return {t:'Keep your next step focused and practical.', k:'dash_default'};
      }

      function renderHero(displayName) {
        var hn = document.getElementById('heroName');
        if (hn) hn.textContent = displayName || 'Utente';

        // ── Dynamic dashboard message ──
        var heroP = document.getElementById('heroText');
        if (heroP) {
          var metrics = computeDashboardMetrics();
          var rule = chooseDashboardMessage(metrics);
          var msg = rule.t;
          // Use i18n translation if available
          if (rule.k && typeof I18n !== 'undefined' && I18n.t) {
            var translated = I18n.t(rule.k);
            if (translated && translated !== rule.k) msg = translated;
          }
          heroP.textContent = msg;
          heroP.removeAttribute('data-i18n');
        }

        // Update streak icon + goal ring
        updateHeroStreakAndGoal();
      }
      window.renderHero = renderHero;

      // ═══ Streak color progression + weekly goal ring ═══
      function getStreakColor(days) {
        // 10 intervals, 7 days each (0-69+ days)
        var tier = Math.min(9, Math.floor(days / 7));
        var colors = [
          { from:'#3B82F6', to:'#2563EB', glow:'rgba(59,130,246,.3)', shadow:'rgba(59,130,246,.3)' },   // 0-6: blue (cold)
          { from:'#06B6D4', to:'#0891B2', glow:'rgba(6,182,212,.3)', shadow:'rgba(6,182,212,.3)' },      // 7-13: cyan
          { from:'#10B981', to:'#059669', glow:'rgba(16,185,129,.3)', shadow:'rgba(16,185,129,.3)' },     // 14-20: teal-green
          { from:'#22C55E', to:'#16A34A', glow:'rgba(34,197,94,.3)', shadow:'rgba(34,197,94,.3)' },       // 21-27: green
          { from:'#84CC16', to:'#65A30D', glow:'rgba(132,204,22,.3)', shadow:'rgba(132,204,22,.3)' },     // 28-34: lime
          { from:'#EAB308', to:'#CA8A04', glow:'rgba(234,179,8,.3)', shadow:'rgba(234,179,8,.3)' },       // 35-41: yellow
          { from:'#F59E0B', to:'#D97706', glow:'rgba(245,158,11,.3)', shadow:'rgba(245,158,11,.3)' },     // 42-48: amber
          { from:'#F97316', to:'#EA580C', glow:'rgba(249,115,22,.3)', shadow:'rgba(249,115,22,.3)' },     // 49-55: orange
          { from:'#EF4444', to:'#DC2626', glow:'rgba(239,68,68,.3)', shadow:'rgba(239,68,68,.3)' },       // 56-62: red
          { from:'#8B5CF6', to:'#EC4899', glow:'rgba(139,92,246,.3)', shadow:'rgba(236,72,153,.3)' }     // 63+: animated gradient loop
        ];
        return colors[tier];
      }

      // ═══ RENDER: Hero "Continue Learning" cards from real user data ═══
      async function renderHeroCards() {
        var container = document.getElementById('heroCards');
        if (!container) return;
        try {
          var sessions = window.SottotitoliData ? await window.SottotitoliData.getSessions(null, 1) : [];
          var banks = window.SottotitoliData ? await window.SottotitoliData.getWordbanks('en') : [];
          var html = '';

          // ── Most recent session ──
          if (sessions && sessions.length > 0) {
            var s = sessions[0];
            var name = s.name || 'Session ' + new Date(s.started_at).toLocaleDateString('it-IT');
            var ago = timeAgo(s.started_at);
            var words = s.words_count || 0;
            html += '<div class="glass-card hero-glass-card" style="padding:24px;display:flex;align-items:center;justify-content:space-between;cursor:pointer" onclick="var nav=document.querySelector(\'[data-panel=trascrizioni]\');if(nav)nav.click();setTimeout(function(){trOpenEditor(\''+s.id+'\')},300)">'+
              '<div style="flex:1;min-width:0">'+
              '<p class="c-micro c-micro--soft c-micro--dim c-micro--mb"><span data-i18n="hero_transcript">Trascrizione</span></p>'+
              '<p class="hero-glass-title" style="font-size:22px;font-weight:500;color:var(--text);margin:0;font-family:\'Inter\',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+escHtml(name)+'</p>'+
              '<p class="c-meta c-meta--dim c-meta--mt">'+ago+' · '+words+' <span data-i18n="hero_words">parole</span></p>'+
              '</div>'+
              '<div class="gc-icon-box gc-cyan" style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.05);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--cyan)">'+
              '<span class="material-symbols-outlined" style="font-size:22px;font-variation-settings:\'FILL\'1">description</span></div>'+
              '</div>';
          } else {
            html += '<div class="glass-card hero-glass-card" style="padding:24px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;opacity:.7" onclick="if(window.toggleStartSession)window.toggleStartSession()">'+
              '<div style="flex:1;min-width:0">'+
              '<p class="c-micro c-micro--soft c-micro--dim c-micro--mb"><span data-i18n="hero_transcript">Trascrizione</span></p>'+
              '<p class="hero-glass-title" style="font-size:22px;font-weight:500;color:var(--text);margin:0;font-family:\'Inter\',sans-serif"><span data-i18n="hero_new_session_title">Avvia una nuova sessione</span></p>'+
              '<p class="c-meta c-meta--dim c-meta--mt"><span data-i18n="hero_new_session_desc">Cattura sottotitoli in tempo reale</span></p>'+
              '</div>'+
              '<div class="gc-icon-box gc-cyan" style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.05);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--cyan)">'+
              '<span class="material-symbols-outlined" style="font-size:22px;font-variation-settings:\'FILL\'1">mic</span></div>'+
              '</div>';
          }

          // ── Most recent word bank ──
          var wbWithWords = banks ? banks.filter(function(b){ return (b.word_count || 0) > 0; }) : [];
          if (wbWithWords.length > 0) {
            var wb = wbWithWords[0];
            html += '<div class="glass-card hero-glass-card" style="padding:24px;display:flex;align-items:center;justify-content:space-between;cursor:pointer" onclick="var nav=document.querySelector(\'[data-panel=wordbanks]\');if(nav)nav.click()">'+
              '<div style="flex:1;min-width:0">'+
              '<p class="c-micro c-micro--soft c-micro--dim c-micro--mb"><span data-i18n="hero_word_bank">Banca Parole</span></p>'+
              '<p class="hero-glass-title" style="font-size:22px;font-weight:500;color:var(--text);margin:0;font-family:\'Inter\',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+escHtml(wb.name)+'</p>'+
              '<p class="c-meta c-meta--dim c-meta--mt">'+(wb.word_count||0)+' <span data-i18n="hero_terms">termini</span></p>'+
              '</div>'+
              '<div class="gc-icon-box gc-teal" style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.05);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--teal)">'+
              '<span class="material-symbols-outlined" style="font-size:22px">menu_book</span></div>'+
              '</div>';
          } else {
            html += '<div class="glass-card hero-glass-card" style="padding:24px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;opacity:.7" onclick="var nav=document.querySelector(\'[data-panel=wordbanks]\');if(nav)nav.click();setTimeout(function(){if(window.wbShowCreate)wbShowCreate()},400)">'+
              '<div style="flex:1;min-width:0">'+
              '<p class="c-micro c-micro--soft c-micro--dim c-micro--mb"><span data-i18n="hero_word_bank">Banca Parole</span></p>'+
              '<p class="hero-glass-title" style="font-size:22px;font-weight:500;color:var(--text);margin:0;font-family:\'Inter\',sans-serif"><span data-i18n="hero_new_bank_title">Crea una nuova banca parole</span></p>'+
              '<p class="c-meta c-meta--dim c-meta--mt"><span data-i18n="hero_new_bank_desc">Raccogli e organizza il tuo vocabolario</span></p>'+
              '</div>'+
              '<div class="gc-icon-box gc-teal" style="width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.05);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--teal)">'+
              '<span class="material-symbols-outlined" style="font-size:22px">style</span></div>'+
              '</div>';
          }

          container.innerHTML = html;
        } catch(e) { /* best effort */ }
      }
      window.renderHeroCards = renderHeroCards;

      function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
      function timeAgo(dateStr) {
        if (!dateStr) return '';
        var diff = Date.now() - new Date(dateStr).getTime();
        var mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return mins + 'm ago';
        var hrs = Math.floor(mins / 60);
        if (hrs < 24) return hrs + 'h ago';
        var days = Math.floor(hrs / 24);
        if (days < 30) return days + 'd ago';
        return Math.floor(days / 30) + 'mo ago';
      }

      async function updateHeroStreakAndGoal() {
        // ── Streak ──
        var streakDays = parseInt(localStorage.getItem('s8t-streak') || '0');
        var streakEl = document.getElementById('heroStreakDays');
        var streakBox = document.getElementById('heroStreakBox');
        var streakGlow = document.getElementById('heroStreakGlow');
        if (streakEl) streakEl.innerHTML = streakDays + ' <span style="font-size:18px;font-weight:300;opacity:.6">' + (window.I18n && I18n.getLang()==='en' ? 'days' : 'giorni') + '</span>';
        if (streakBox && streakGlow) {
          var sc = getStreakColor(streakDays);
          var isAnimated = Math.floor(streakDays / 7) >= 9;
          if (isAnimated) {
            streakBox.style.background = 'linear-gradient(135deg, #8B5CF6, #EC4899, #F59E0B, #8B5CF6)';
            streakBox.style.backgroundSize = '300% 300%';
            streakBox.style.animation = 'streak-rainbow 3s ease infinite';
            streakGlow.style.background = 'rgba(139,92,246,.4)';
            streakBox.style.boxShadow = '0 8px 24px rgba(139,92,246,.35)';
          } else {
            streakBox.style.animation = 'none';
            streakBox.style.backgroundSize = '';
            streakBox.style.background = 'linear-gradient(135deg, ' + sc.from + ', ' + sc.to + ')';
            streakBox.style.boxShadow = '0 8px 24px ' + sc.shadow;
            streakGlow.style.background = sc.glow;
          }
        }

        // ── Weekly Lexical Goal ──
        try {
          var sb = window.sottotitoliSupabase;
          if (!sb) return;
          var r = await sb.auth.getSession();
          if (!r.data?.session) return;
          var userId = r.data.session.user.id;
          var lang = window.SOTTOTITOLI_STUDY_LANG || 'en';
          // Get Monday of this week
          var now = new Date();
          var dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
          var monday = new Date(now);
          monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7)); // Monday
          monday.setHours(0,0,0,0);
          var mondayIso = monday.toISOString().substring(0,10);
          var endIso = new Date(now.getTime() + 86400000).toISOString().substring(0,10);
          var sRes = await sb.from('sessions').select('words_count').eq('user_id', userId).like('language_pair', lang + '%').gte('started_at', mondayIso).lt('started_at', endIso);
          var newWords = 0;
          if (sRes.data) { sRes.data.forEach(function(s){ newWords += (s.words_count || 0); }); }
          var goal = 100;
          var pct = Math.min(100, Math.round(newWords / goal * 100));
          // Update ring
          var ring = document.getElementById('heroGoalRing');
          var pctEl = document.getElementById('heroGoalPct');
          var textEl = document.getElementById('heroGoalText');
          if (ring) {
            var circumference = 251.2; // 2 * PI * 40
            var offset = circumference - (pct / 100) * circumference;
            ring.setAttribute('stroke-dashoffset', offset);
            // Color the ring based on progress
            if (pct >= 100) ring.style.stroke = '#10B981';
            else if (pct >= 50) ring.style.stroke = 'var(--cyan)';
            else ring.style.stroke = 'var(--cyan)';
          }
          if (pctEl) { pctEl.textContent = pct + '%'; pctEl.style.color = pct >= 100 ? '#10B981' : 'var(--text)'; }
          if (textEl) textEl.textContent = newWords + ' / ' + goal + ' unique tokens';
        } catch(e) { /* silent */ }

        // ── New words yesterday + This week ──
        try {
          if (!window.sottotitoliSupabase) return;
          var r2 = await window.sottotitoliSupabase.auth.getSession();
          if (!r2.data?.session) return;
          var uid = r2.data.session.user.id;
          var lng = window.SOTTOTITOLI_STUDY_LANG || 'en';
          var todayIso = now.toISOString().substring(0,10);
          var yesterday = new Date(now.getTime() - 86400000).toISOString().substring(0,10);
          // Yesterday
          var yRes = await window.sottotitoliSupabase.from('sessions').select('words_count').eq('user_id', uid).like('language_pair', lng + '%').gte('started_at', yesterday).lt('started_at', todayIso);
          var yestWords = 0;
          if (yRes.data) { yRes.data.forEach(function(s){ yestWords += (s.words_count || 0); }); }
          var nwEl = document.getElementById('heroNewWords');
          if (nwEl) nwEl.textContent = '+' + yestWords + ' words';
          // This week (since Monday)
          var twEl = document.getElementById('heroThisWeek');
          if (twEl) twEl.textContent = '+' + newWords + ' words';
        } catch(e) { /* silent */ }
      }

      // Add rainbow keyframe if not present
      if (!document.getElementById('streak-rainbow-style')) {
        var styleEl = document.createElement('style');
        styleEl.id = 'streak-rainbow-style';
        styleEl.textContent = '@keyframes streak-rainbow{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}';
        document.head.appendChild(styleEl);
      }

      // ═══ Load sessions into AI Report dropdowns ═══
      async function loadReportSessions() {
        try {
          var sb = window.sottotitoliSupabase;
          if (!sb) return;
          var r = await sb.auth.getSession();
          if (!r.data?.session) return;
          var userId = r.data.session.user.id;
          var sRes = await sb.from('sessions').select('id,started_at,duration_seconds,language_pair').eq('user_id', userId).order('started_at', { ascending: false }).limit(20);
          var sessions = sRes.data || [];
          var opts = '<option value="">— Seleziona una sessione —</option>';
          sessions.forEach(function(s) {
            var d = new Date(s.started_at);
            var dateStr = d.toLocaleDateString('it-IT', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
            var mins = Math.round((s.duration_seconds || 0) / 60);
            opts += '<option value="'+s.id+'">'+dateStr+' · '+mins+'min · '+(s.language_pair||'en')+'</option>';
          });
          var sel1 = document.getElementById('snapshotSessionSelect');
          var sel2 = document.getElementById('reportSessionSelect');
          if (sel1) sel1.innerHTML = opts;
          if (sel2) sel2.innerHTML = opts;
          var snapBtn = document.getElementById('generaSnapshotBtn');
          var repBtn = document.getElementById('generaReportBtn');
          if (snapBtn) snapBtn.onclick = function() {
            var sid = document.getElementById('snapshotSessionSelect')?.value;
            if (!sid) { appAlert('Seleziona una sessione da analizzare.', 'Sessione richiesta', '📌'); return; }
            requestSnapshot(sid);
          };
          if (repBtn) repBtn.onclick = function() {
            var sid = document.getElementById('reportSessionSelect')?.value;
            if (!sid) { appAlert('Seleziona una sessione da analizzare.', 'Sessione richiesta', '📌'); return; }
            requestFullReport(sid);
          };
        } catch(e) { console.warn('loadReportSessions:', e); }
      }

      async function requestSnapshot(sessionId) {
        var btn = document.getElementById('generaSnapshotBtn');
        if (btn) { btn.disabled = true; btn.textContent = 'Analisi in corso…'; }
        try {
          var sb = window.sottotitoliSupabase;
          var r = await sb.auth.getSession();
          if (!r.data?.session) return;
          var uid = r.data.session.user.id;
          // Module 0 = Snapshot (free, 1/day)
          var ins = await sb.from('ai_report_requests').insert({
            user_id: uid,
            session_ids: [sessionId],
            module_id: 0,
            module_key: '0',
            scope_type: 'single_session',
            status: 'queued'
          });
          if (ins.error) { console.warn('Snapshot insert error:', ins.error.message); throw ins.error; }
          if (XP && XP.award) XP.award('ai_report');
          var t = document.createElement('div');
          t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--accent);color:#fff;font-size:13px;font-weight:700;padding:10px 24px;border-radius:99px;z-index:99999;opacity:0;transition:opacity .3s;pointer-events:none;font-family:var(--font-body)';
          t.textContent = '✅ Snapshot richiesto! Riceverai una notifica quando è pronto.';
          document.body.appendChild(t);
          requestAnimationFrame(function(){ t.style.opacity = '1'; });
          setTimeout(function(){ t.style.opacity = '0'; setTimeout(function(){ t.remove(); }, 300); }, 3000);
        } catch(e) { console.warn('requestSnapshot:', e); }
        if (btn) { setTimeout(function(){ btn.disabled = false; btn.textContent = 'Genera Snapshot'; }, 5000); }
      }

      async function requestFullReport(sessionId) {
        var btn = document.getElementById('generaReportBtn');
        if (btn) { btn.disabled = true; btn.textContent = 'Richiesta in corso…'; }
        try {
          var sb = window.sottotitoliSupabase;
          var r = await sb.auth.getSession();
          if (!r.data?.session) return;
          var uid = r.data.session.user.id;
          // Module 1 = Comprehensive (3cr)
          var ins = await sb.from('ai_report_requests').insert({
            user_id: uid,
            session_ids: [sessionId],
            module_id: 1,
            module_key: '1',
            scope_type: 'single_session',
            status: 'queued'
          });
          if (ins.error) { console.warn('FullReport insert error:', ins.error.message); throw ins.error; }
          if (XP && XP.award) XP.award('ai_report');
          var t = document.createElement('div');
          t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--accent);color:#fff;font-size:13px;font-weight:700;padding:10px 24px;border-radius:99px;z-index:99999;opacity:0;transition:opacity .3s;pointer-events:none;font-family:var(--font-body)';
          t.textContent = '✅ Report richiesto! Riceverai una notifica quando è pronto.';
          document.body.appendChild(t);
          requestAnimationFrame(function(){ t.style.opacity = '1'; });
          setTimeout(function(){ t.style.opacity = '0'; setTimeout(function(){ t.remove(); }, 300); }, 3000);
        } catch(e) { console.warn('requestFullReport:', e); }
        if (btn) { setTimeout(function(){ btn.disabled = false; btn.textContent = 'Genera Report · 1 credito'; }, 5000); }
      }

      // ═══ RENDER: Panoramica metrics ───
      function renderMetrics() {
        // ── Render chart box (corona) for dashboard + word banks ──
        mcSetActiveLabel();
        renderChartBox('dash');
        renderChartBox('wb');
        updateDashVsBoxes();
        // Re-render chart + vs-boxes + sparklines when language changes
        window.addEventListener('i18n-changed', function(){
          mcSetActiveLabel();
          var selected = document.querySelector('#pnl-panoramica .metric-card.selected');
          dashChart.metric = selected ? selected.getAttribute('data-metric') : 'totalMinutes';
          renderChartBox('dash');
          renderChartBox('wb');
          updateDashVsBoxes();
          updateWbVsBoxes();
          initSparklineTooltips();
        });
      }

      // ═══ DASHBOARD "vs" BOXES (Sessioni / Attività / Fasce orarie) ═══
      var dashBoxData = null;
      async function loadDashBoxData() {
        if (dashBoxData) return dashBoxData;
        var s = currentStats();
        var d = {
          sessions: s ? (s.totalSessions||0) : 0,
          recMin: s ? Math.round(s.totalMinutes||0) : 0,
          siteMin: 0, minsPerSess: 0, activeShare: 0,
          bands:[0,0,0,0], bandNames:['Mattina','Giorno','Sera','Notte'], bandColors:['#fbbf24','#22d3ee','#8b5cf6','#6366f1'],
          bandMax:0, bandMaxName:'—'
        };
        try {
          var minMap = JSON.parse(localStorage.getItem('sottotitoli-site-minutes') || '{}');
          var tot = 0; for (var k in minMap) tot += (minMap[k]||0);
          d.siteMin = Math.round(tot);
        } catch(e) {}
        d.minsPerSess = d.sessions > 0 ? Math.round(d.recMin / d.sessions) : 0;
        // Time-of-day split + active-day share (from all sessions)
        try {
          var sb = window.sottotitoliSupabase;
          if (sb) {
            var r = await sb.auth.getSession();
            if (r.data && r.data.session) {
              var uid = r.data.session.user.id;
              var res = await sb.from('sessions').select('duration_seconds,started_at').eq('user_id', uid);
              var dateSet = {}, minT = Infinity, maxT = -Infinity;
              (res.data||[]).forEach(function(sess){
                var mins = Math.round((sess.duration_seconds||0)/60);
                if (mins <= 0) return;
                var h = 12;
                if (sess.started_at) {
                  try { h = new Date(sess.started_at).getHours(); } catch(e) {}
                  var ds = sess.started_at.substring(0,10); dateSet[ds] = 1;
                  var tt = new Date(sess.started_at).getTime();
                  if (tt < minT) minT = tt; if (tt > maxT) maxT = tt;
                }
                if (h < 6) d.bands[3] += mins; else if (h < 12) d.bands[0] += mins; else if (h < 18) d.bands[1] += mins; else d.bands[2] += mins;
              });
              var span = (maxT - minT) / 86400000 + 1;
              d.activeShare = (span > 0) ? (Object.keys(dateSet).length / span) : 0;
              for (var i=0;i<4;i++) if (d.bands[i] > d.bandMax) { d.bandMax = d.bands[i]; d.bandMaxName = d.bandNames[i]; }
            }
          }
        } catch(e) {}
        dashBoxData = d;
        return d;
      }
      function vsT(key, fb) { try { if (window.I18n && I18n.t) { var t = I18n.t(key); if (t && t !== key) return t; } } catch(e){} return fb; }
      function setVsBar(base, m, kind, a, b, ca, cb) {
        var fill = document.getElementById(base + 'mcBar_' + m), segA = document.getElementById(base + 'mcSegA_' + m), segB = document.getElementById(base + 'mcSegB_' + m);
        if (!fill || !segA || !segB) return;
        if (kind === 'fill') { fill.style.display='block'; fill.style.background=ca; fill.style.width=Math.max(2,Math.min(100,a))+'%'; segA.style.display='none'; segB.style.display='none'; }
        else { fill.style.display='none'; segA.style.display='block'; segA.style.background=ca; segA.style.width=Math.max(0,Math.min(100,a))+'%'; segB.style.display='block'; segB.style.background=cb; segB.style.width=Math.max(0,Math.min(100,b))+'%'; }
      }
      function setVsBands(base, m, shares, colors) {
        var fill = document.getElementById(base + 'mcBar_' + m); if (fill) fill.style.display='none';
        for (var i=0;i<4;i++) {
          var el = document.getElementById(base + 'mcSeg' + String.fromCharCode(65+i) + '_' + m);
          if (el) { el.style.display='block'; el.style.background=colors[i]; el.style.width=Math.max(0,Math.min(100,shares[i]))+'%'; }
        }
      }
      function applyVsBoxes(base, d) {
        var q = function(id){ return document.getElementById(base + id); };
        var a = q('mcA_sessions'), avs = q('mcVs_sessions');
        if (a) a.textContent = (d.sessions||0);
        if (avs) avs.textContent = (d.minsPerSess||0);
        var b = q('mcA_totalMinutes'), bvs = q('mcVs_totalMinutes');
        if (b) b.textContent = fmtMinutes(d.siteMin);
        if (bvs) bvs.textContent = fmtMinutes(d.recMin);
        var c = q('mcA_timebands'), cvs = q('mcVs_timebands');
        if (c) c.textContent = fmtMinutes(d.recMin);
        if (cvs) cvs.textContent = d.bandMaxName + ' ' + fmtMinutes(d.bandMax);
        setVsBar(base, 'sessions', 'fill', d.activeShare*100, 0, 'var(--cyan)', 'var(--cyan)');
        var sbtot = Math.max(1, d.siteMin + d.recMin);
        // Match the Activity corona chart colours exactly: recording = cyan (#06b6d4), extra site time = amber (#f59e0b).
        // (theme tokens --cyan/--amber collapse to the same pink in genz/genz-dark → the bar showed two identical segments)
        setVsBar(base, 'totalMinutes', 'seg', d.recMin/sbtot*100, d.siteMin/sbtot*100, '#06b6d4', '#f59e0b');
        var btot = Math.max(1, d.bands[0]+d.bands[1]+d.bands[2]+d.bands[3]);
        setVsBands(base, 'timebands', [d.bands[0]/btot*100, d.bands[1]/btot*100, d.bands[2]/btot*100, d.bands[3]/btot*100], d.bandColors);
      }
      function updateDashVsBoxes() { loadDashBoxData().then(function(d){ applyVsBoxes('', d); }); }
      function updateWbVsBoxes() { if (!document.getElementById('wbOvStatsRow')) return; loadWordChartData().then(applyWbWordBoxes); }
      window.loadDashBoxData = loadDashBoxData;
      window.applyVsBoxes = applyVsBoxes;
      window.updateDashVsBoxes = updateDashVsBoxes;
      window.updateWbVsBoxes = updateWbVsBoxes;

      // ═══ RENDER: Wrapped showcase (year-dash gen-z boxes) ═══
      function wscT(key, fallback) {
        try {
          if (typeof I18n !== 'undefined' && I18n.t) {
            var t = I18n.t(key);
            if (t && t !== key) return t;
          }
        } catch(e) { /* fall through */ }
        return fallback;
      }

      // Read site-presence activity (any time the app was open), NOT session-based
      function siteActivityEntries() {
        try {
          var raw = JSON.parse(localStorage.getItem('sottotitoli-site-activity') || '[]');
          return Array.isArray(raw) ? raw : [];
        } catch (e) { return []; }
      }

      function renderLearnerMissions() {
        var misEl = document.getElementById('wscMissions');
        if (!misEl) return;
        var mst = {};
        try { mst = JSON.parse(localStorage.getItem('sottotitoli-learner-missions') || '{}'); } catch(e) {}
        function aiLessonMeta(lang){
          try {
            var l = JSON.parse(localStorage.getItem('sottotitoli-learner-mission-' + lang) || 'null');
            return l ? { title: l.title || '', sub: l.subtitle || l.objective || '' } : { title: '', sub: '' };
          } catch(e){ return { title: '', sub: '' }; }
        }
        var tAi = wscT('wsc_mission_ai','Missione AI');
        var tTheme = wscT('wsc_mission_theme','Missione a tema');
        var tThemeSub = wscT('wsc_mission_theme_sub','Vocabolario essenziale per l\'uso quotidiano.');
        var tIn = wscT('wsc_mission_inprogress','In corso');
        var tDone = wscT('wsc_mission_done','Completata');
        var tTodo = wscT('wsc_mission_todo','Non iniziata');
        var tEn = wscT('wsc_lang_en','Inglese');
        var tIt = wscT('wsc_lang_it','Italiano');
        var langs = [['en', tEn], ['it', tIt]];
        var defs = [['ai', tAi], ['theme', tTheme]];
        var rows = '';
        langs.forEach(function(L){
          defs.forEach(function(M){
            var key = L[0] + ':' + M[0];
            var st = mst[key];
            var meta = (M[0] === 'ai') ? aiLessonMeta(L[0]) : { title: '', sub: '' };
            var title = (st && st.title) ? st.title : (meta.title || M[1]);
            var desc = (st && st.desc) ? st.desc : meta.sub;
            if (!desc && M[0] === 'theme') desc = tThemeSub;
            var pct = st && st.done ? 100 : (st ? (st.pct || 0) : 0);
            var done = !!(st && st.done);
            var started = !!(st && st.started);
            var status = done ? tDone + ' · 100%' : started ? tIn + ' · ' + pct + '%' : tTodo;
            var cls = done ? ' wm-done' : started ? '' : ' wm-todo';
            rows += '<div class="wm-row'+cls+'">'+
              '<div class="wm-top"><div style="min-width:0"><div class="wm-name" title="'+escHtml(title)+'">'+escHtml(title)+'</div><div class="wm-lang">'+L[1]+'</div></div>'+
              '<div class="wm-pct">'+pct+'%</div></div>'+
              (desc ? '<div class="wm-desc">'+escHtml(desc)+'</div>' : '')+
              '<div class="wm-track"><div class="wm-fill" style="width:'+pct+'%"></div></div>'+
              '<div class="wm-status">'+status+'</div></div>';
          });
        });
        misEl.innerHTML = '<div class="wm-grid">'+rows+'</div>';
      }
      window.renderLearnerMissions = renderLearnerMissions;

      function renderWrappedShowcase() {
        var box = document.getElementById('wrappedShowcase');
        if (!box) return;
        var s = currentStats() || {};
        var allSess = (s && s._allSessions) || [];
        var streak = parseInt(localStorage.getItem('s8t-streak') || '0');
        var totalMinutes = s.totalMinutes || 0;
        var totalWords = s.totalWords || 0;
        var totalSessions = s.totalSessions || 0;
        // ═══ Box 1 · Attività recente — feed delle ultime 4 sessioni ═══
        var feedEl = document.getElementById('wscActivityFeed');
        if (feedEl) {
          var recent = (allSess || []).slice().sort(function(a,b){ return new Date(b.started_at) - new Date(a.started_at); }).slice(0,5);
          if (!recent.length) {
            feedEl.innerHTML = '<div class="wsc-feed-empty">Nessuna sessione ancora. Avvia la prima.</div>';
          } else {
            feedEl.innerHTML = recent.map(function(x){
              var wc = x.words_count || 0;
              var lex = x.lexical_diversity || 0;
              var uniq = lex > 0 ? Math.round(lex * wc) : '—';
              var minutes = Math.max(1, Math.round((x.duration_seconds || 0) / 60));
              var date = x.started_at ? new Date(x.started_at).toLocaleDateString('it-IT',{day:'2-digit',month:'short'}) : '—';
              var lang = (x.language_pair || 'en').toUpperCase();
              var name = (x.name && String(x.name).trim()) ? String(x.name).trim() : 'Sessione del ' + date;
              var lexTxt = lex > 0 ? lex.toFixed(2) : '—';
              var openFn = "var n=document.querySelector('[data-panel=trascrizioni]');if(n)n.click();setTimeout(function(){if(window.trOpenEditor)trOpenEditor('"+x.id+"')},350)";
              return '<div class="wsc-feed-item" onclick="'+openFn+'">'+
                '<div style="min-width:0"><div class="wsc-feed-name" title="'+escHtml(name)+'">'+escHtml(name)+'</div>'+
                '<div class="wsc-feed-date">'+date+' · '+lang+'</div></div>'+
                '<div class="wsc-feed-stats">'+
                  '<div class="wsc-feed-stat"><b>'+minutes+'</b><span>min</span></div>'+
                  '<div class="wsc-feed-stat"><b>'+wc+'</b><span>parole</span></div>'+
                  '<div class="wsc-feed-stat"><b>'+uniq+'</b><span>uniche</span></div>'+
                  '<div class="wsc-feed-stat"><b>'+lexTxt+'</b><span>div. lessicale</span></div>'+
                '</div></div>';
            }).join('');
          }
        }

        // ═══ Box 4 · Mission progress ═══
        // Now hosted in the Learner Overview tab — shared renderer below.
        renderLearnerMissions();
      }
      window.renderWrappedShowcase = renderWrappedShowcase;

      // ── Keep the dashboard "Ultime sessioni" feed in sync when a session is renamed ──
      // The feed renders from statsEN/statsIT._allSessions, which are loaded once at
      // startup — renaming in Trascrizioni only touched Supabase, so the old name
      // lingered on the dashboard until a full reload. This helper patches the
      // in-memory lists in place, drops the data-service cache, and re-renders.
      window.syncSessionName = function(sid, newName) {
        if (!sid) return;
        [window.statsEN, window.statsIT].forEach(function(st){
          if (st && Array.isArray(st._allSessions)) {
            st._allSessions.forEach(function(s){ if (s && s.id === sid) s.name = newName; });
          }
        });
        if (typeof SottotitoliData !== 'undefined' && SottotitoliData.cacheClear) {
          try { SottotitoliData.cacheClear(); } catch(e) {}
        }
        if (window.renderWrappedShowcase) window.renderWrappedShowcase();
      };

      // ═══ Box 7 · Scarica riepilogo come PNG (wrapped shareable image) ═══
      function wscDownloadImage() {
        var el = document.getElementById('wrappedShowcase');
        if (!el) { if (window.toast) toast('Nessun riepilogo da scaricare'); return; }
        if (typeof html2canvas === 'undefined') { if (window.toast) toast('Libreria non caricata'); return; }
        html2canvas(el, { scale: 2, useCORS: true, backgroundColor: null, logging: false, windowWidth: el.scrollWidth })
          .then(function(canvas){
            var a = document.createElement('a');
            a.download = 'sottotitoli-wrapped.png';
            a.href = canvas.toDataURL('image/png');
            a.click();
            if (window.toast) toast('✅ Riepilogo scaricato');
          })
          .catch(function(e){ console.warn('wscDownload:', e); if (window.toast) toast('⚠️ Errore nel download'); });
      }
      window.wscDownloadImage = wscDownloadImage;

      function wscShare() {
        var el = document.getElementById('wrappedShowcase');
        if (!el) { if (window.toast) toast('Nessun riepilogo da condividere'); return; }
        if (navigator.share) {
          html2canvas(el, { scale: 2, useCORS: true, backgroundColor: null, logging: false, windowWidth: el.scrollWidth })
            .then(function(canvas){
              return new Promise(function(res){ canvas.toBlob(res, 'image/png'); });
            })
            .then(function(blob){
              var file = new File([blob], 'sottotitoli-wrapped.png', { type: 'image/png' });
              return navigator.share({ title: 'I miei progressi Sottotitoli', text: 'Il mio riepilogo stile wrapped su Sottotitoli! 🚀', files: [file] });
            })
            .catch(function(e){ if (e && e.name !== 'AbortError') { console.warn('wscShare:', e); wscDownloadImage(); } });
        } else {
          wscDownloadImage();
        }
      }
      window.wscShare = wscShare;

      // ═══ Metric card selection — switches the big chart ═══
      // Active-chart badge label → sets --mc-active used by .metric-card.selected::after
      function mcSetActiveLabel(){
        var lab = (typeof I18n !== 'undefined' && I18n.t) ? I18n.t('metric_active') : '';
        if (!lab || lab === 'metric_active') lab = 'Nel grafico';
        try { document.documentElement.style.setProperty('--mc-active', '"' + lab + '"'); } catch(e){}
      }
      function selectMetricCard(card) {
        var metric = card.getAttribute('data-metric') || 'totalMinutes';
        dashChart.metric = metric;
        document.querySelectorAll('#pnl-panoramica .metric-card').forEach(function(c){
          c.classList.remove('selected'); c.style.opacity = '';
        });
        card.classList.add('selected'); card.style.opacity = '1';
        mcSetActiveLabel();
        renderChartBox('dash');
      }
      window.selectMetricCard = selectMetricCard;

      // ═══ CHART BOX — corona (radial) + Periodo sidebar (dashboard + word banks) ═══
      var dashChart = { metric:'totalMinutes', tl:'week' };
      var wbChart = { metric:'words', tl:'week' };
      var dashChartData = null;
      function isoDaysAgo(n){ var d = new Date(Date.now() - n*86400000); return d.toISOString().substring(0,10); }
      function chartIds(scope){ return scope === 'wb'
        ? { chart:'wbChart', title:'wbChartTitle', sub:'wbChartSubtitle', total:'wbChartTotal', pl:'wbChartPeriodLabel', media:'wbChartMedia', ml:'wbChartMediaLabel' }
        : { chart:'dailyChart', title:'dailyChartTitle', sub:'dailyChartSubtitle', total:'dailyChartTotal', pl:'dailyChartPeriodLabel', media:'dailyChartMedia', ml:'dailyChartMediaLabel', legend:'dailyChartLegend' }; }
      async function loadDashChartData(){
        if (dashChartData) return dashChartData;
        var out = { sessions:[], siteMap:{} };
        try { out.siteMap = JSON.parse(localStorage.getItem('sottotitoli-site-minutes') || '{}') || {}; } catch(e) {}
        try {
          var sb = window.sottotitoliSupabase;
          if (sb) {
            var r = await sb.auth.getSession();
            if (r.data && r.data.session) {
              var uid = r.data.session.user.id;
              var res = await sb.from('sessions').select('duration_seconds,started_at').eq('user_id', uid);
              (res.data||[]).forEach(function(s){
                if (!s.started_at) return;
                var mins = Math.round((s.duration_seconds||0)/60);
                var h = 12; try { h = new Date(s.started_at).getHours(); } catch(e) {}
                out.sessions.push({ iso:s.started_at.substring(0,10), h:h, m:mins });
              });
            }
          }
        } catch(e) {}
        dashChartData = out;
        return out;
      }
      function chartBoxDays(tl, data){
        if (tl === 'week')  { var a=[]; for (var i=6;i>=0;i--) a.push(isoDaysAgo(i)); return a; }
        if (tl === '2week') { var b=[]; for (var i=13;i>=0;i--) b.push(isoDaysAgo(i)); return b; }
        if (tl === 'month') { var c=[]; for (var i=29;i>=0;i--) c.push(isoDaysAgo(i)); return c; }
        var set = {};
        data.sessions.forEach(function(s){ set[s.iso]=1; });
        Object.keys(data.siteMap||{}).forEach(function(k){ if (/^\d{4}-\d{2}-\d{2}$/.test(k)) set[k]=1; });
        var isos = Object.keys(set).sort();
        if (isos.length) return isos;
        var d=[]; for (var j=61;j>=0;j--) d.push(isoDaysAgo(j)); return d;
      }
      function chartBoxValue(metric, iso, data){
        var site = (data.siteMap && data.siteMap[iso]) || 0;
        var count = 0, mins = 0;
        for (var i=0;i<data.sessions.length;i++){ var s=data.sessions[i]; if (s.iso === iso){ count++; mins += s.m; } }
        if (metric === 'totalSessions') return count;
        if (metric === 'totalMinutes') return Math.round(site);
        return mins;
      }

      // ═══ WORD DATA — Parole uniche / salvate / div. lessicale (real per-day) ═══
      var wbWordData = null;
      var CHT = { W:760, H:240, PL:44, PR:18, PT:16, PB:30 };
      // In Breve chart height — taller so the splines/corona breathe (double the original 240).
      var WBH = 460;
      function fmtK(n){ n = Math.round(n||0); if (n >= 1000000) { var m = Math.floor(n/100000)/10; return m.toFixed(1).replace('.',',').replace(',0','') + 'M'; } if (n >= 1000) { var k = Math.floor(n/100)/10; return k.toFixed(1).replace('.',',').replace(',0','') + 'k'; } return '' + n; }
      // Round a value up to a clean axis ceiling (1/2/2.5/5 × 10^n) so the y-axis reads nicely even with outliers.
      function niceCeil(v){ if (v <= 0) return 1; var p = Math.pow(10, Math.floor(Math.log10(v))), f = v / p, nf; if (f <= 1) nf = 1; else if (f <= 2) nf = 2; else if (f <= 2.5) nf = 2.5; else if (f <= 5) nf = 5; else nf = 10; return nf * p; }
      async function loadWordChartData(){
        if (wbWordData) return wbWordData;
        var out = { days:{}, savedByDay:{}, practicedByDay:{}, confirmedByDay:{} };
        try {
          var sb = window.sottotitoliSupabase;
          if (sb) {
            var r = await sb.auth.getSession();
            if (r.data && r.data.session) {
              var uid = r.data.session.user.id;
              var res = await sb.from('sessions').select('started_at,words_count,unique_words_count,lexical_diversity,wpm').eq('user_id', uid);
              (res.data||[]).forEach(function(s){
                if (!s.started_at) return;
                var iso = s.started_at.substring(0,10);
                var wc = s.words_count || 0;
                var uniq = s.unique_words_count;
                if (uniq == null && (s.lexical_diversity||0) > 0) uniq = Math.round(wc * s.lexical_diversity);
                var d = out.days[iso] || (out.days[iso] = { uniq:0, tt:0, ldS:0, ldN:0, wpmS:0, wpmN:0 });
                d.tt += wc; d.uniq += (uniq || 0);
                if ((s.lexical_diversity||0) > 0) { d.ldS += s.lexical_diversity; d.ldN++; }
                if ((s.wpm||0) > 0) { d.wpmS += s.wpm; d.wpmN++; }
              });
            }
          }
        } catch(e) {}
        try {
          var sb2 = window.sottotitoliSupabase;
          if (sb2) {
            var r2 = await sb2.auth.getSession();
            if (r2.data && r2.data.session) {
              var uid2 = r2.data.session.user.id;
              var { data: words } = await sb2.from('review_words').select('created_at,last_reviewed_at,reps,review_state,mastery_score,updated_at').eq('user_id', uid2).limit(5000);
              (words||[]).forEach(function(w){
                if (w.created_at) { var k = w.created_at.substring(0,10); out.savedByDay[k] = (out.savedByDay[k]||0) + 1; }
                if ((w.reps||0) > 0 && w.last_reviewed_at) { var k2 = w.last_reviewed_at.substring(0,10); out.practicedByDay[k2] = (out.practicedByDay[k2]||0) + 1; }
                if (w.review_state === 'mastered' || (w.mastery_score||0) >= 80) { var k3 = (w.last_reviewed_at || w.updated_at || w.created_at); if (k3) { k3 = k3.substring(0,10); out.confirmedByDay[k3] = (out.confirmedByDay[k3]||0) + 1; } }
              });
            }
          }
        } catch(e) {}
        wbWordData = out;
        return out;
      }
      function wordDays(tl, data){
        if (tl === 'week') { var a=[]; for (var i=6;i>=0;i--) a.push(isoDaysAgo(i)); return a; }
        if (tl === '2week') { var b=[]; for (var i=13;i>=0;i--) b.push(isoDaysAgo(i)); return b; }
        if (tl === 'month') { var c=[]; for (var i=29;i>=0;i--) c.push(isoDaysAgo(i)); return c; }
        var set = {};
        Object.keys(data.days||{}).forEach(function(k){ set[k]=1; });
        ['savedByDay','practicedByDay','confirmedByDay'].forEach(function(m){ Object.keys(data[m]||{}).forEach(function(k){ set[k]=1; }); });
        var isos = Object.keys(set).sort();
        if (isos.length) return isos;
        var d=[]; for (var j=61;j>=0;j--) d.push(isoDaysAgo(j)); return d;
      }
      function wordDayValue(days, data, iso){
        var d = data.days[iso] || {};
        return { uniq:d.uniq||0, tt:d.tt||0, sv:data.savedByDay[iso]||0, pr:data.practicedByDay[iso]||0, cf:data.confirmedByDay[iso]||0, ldS:d.ldS||0, ldN:d.ldN||0, wpmS:d.wpmS||0, wpmN:d.wpmN||0 };
      }
      function wordAggregate(days, data){
        var o = { uniq:0, tt:0, sv:0, pr:0, cf:0, ldS:0, ldN:0, wpmS:0, wpmN:0, days:days.length };
        days.forEach(function(iso){ var v = wordDayValue(days, data, iso); o.uniq+=v.uniq; o.tt+=v.tt; o.sv+=v.sv; o.pr+=v.pr; o.cf+=v.cf; o.ldS+=v.ldS; o.ldN+=v.ldN; o.wpmS+=v.wpmS; o.wpmN+=v.wpmN; });
        return o;
      }
      function applyWbWordBoxes(data){
        data = data || wbWordData;
        if (!data) return;
        var o = wordAggregate(wordDays(wbChart.tl, data), data);
        var q = function(id){ return document.getElementById('wb' + id); };
        var a = q('mcA_words'); if (a) a.textContent = fmtK(o.uniq);
        var avs = q('mcVs_words'); if (avs) avs.textContent = fmtK(o.tt);
        var wtot = Math.max(1, o.tt);
        setVsBar('wb', 'words', 'seg', o.uniq/wtot*100, Math.max(0, o.tt - o.uniq)/wtot*100, '#34d399', 'rgba(148,163,184,.5)');
        var b = q('mcA_saved'); if (b) b.textContent = fmtK(o.sv);
        var bvs = q('mcVs_saved'); if (bvs) bvs.textContent = fmtK(o.pr) + ' · ' + fmtK(o.cf);
        var sbtot = Math.max(1, o.sv + o.pr + o.cf);
        setVsBands('wb', 'saved', [o.sv/sbtot*100, o.pr/sbtot*100, o.cf/sbtot*100], ['#fbbf24', '#34d399', '#8b5cf6']);
        var avgLD = o.ldN ? o.ldS/o.ldN : 0;
        var avgW = o.wpmN ? Math.round(o.wpmS/o.wpmN) : 0;
        var c = q('mcA_lexdiv'); if (c) c.textContent = avgLD ? avgLD.toFixed(2) : '—';
        var cvs = q('mcVs_lexdiv'); if (cvs) cvs.textContent = avgW ? avgW : '—';
        setVsBar('wb', 'lexdiv', 'fill', Math.min(100, avgLD*100), 0, '#8b5cf6', '#8b5cf6');
      }
      function wordMeta(m, isEn){
        if (m === 'words') return { title:isEn?'Unique words':'Parole uniche', sub:isEn?'Unique vs total words per day, with the NEON line of words you saved.':'Parole uniche vs totali per giorno, più la linea NEON delle parole salvate.', big:function(o){return fmtK(o.uniq);}, media:function(o){return fmtK(Math.round(o.uniq/Math.max(1,o.days)));}, mediaLabel:isEn?'avg / day':'media/giorno', color:'#34d399' };
        if (m === 'saved') return { title:isEn?'Saved words':'Parole salvate', sub:isEn?'Words you saved, practiced and confirmed — corona for every period.':'Parole salvate, praticate e confermate — corona per ogni periodo.', big:function(o){return fmtK(o.sv);}, media:function(o){return fmtK(Math.round(o.sv/Math.max(1,o.days)));}, mediaLabel:isEn?'avg / day':'media/giorno', color:'#fbbf24' };
        return { title:isEn?'Lexical diversity':'Div. lessicale', sub:isEn?'Unique vs total words — their ratio is your lexical diversity. Below: average WPM.':'Parole uniche vs totali — il loro rapporto è la diversità lessicale. Sotto: media WPM.', big:function(o){return o.ldN ? (o.ldS/o.ldN).toFixed(2) : '—';}, media:function(o){return o.wpmN ? (''+Math.round(o.wpmS/o.wpmN)) : '—';}, mediaLabel:isEn?'avg words/min':'media parole/min', color:'#8b5cf6' };
      }
      // ── Y-AXIS scale control for the chart boxes (gear menu: Auto / Top pulito / Fissa + play replay) ──
      // Persisted per user; only the line charts (word bank) respond — the dashboard uses corona (no y-axis).
      window.YAXIS = (function(){
        var mode = 'auto';
        var fixed = 40;
        try { mode = localStorage.getItem('wb-yaxis-mode') || 'auto'; } catch(e){}
        try { fixed = parseInt(localStorage.getItem('wb-yaxis-fixed'),10) || 40; } catch(e){}
        if (mode === 'nice') mode = 'auto';
        function save(){ try { localStorage.setItem('wb-yaxis-mode', mode); localStorage.setItem('wb-yaxis-fixed', String(fixed)); } catch(e){} }
        function domain(dmax){
          dmax = Math.max(1, dmax || 1);
          var min = 0, max, step;
          if (mode === 'nice') max = niceCeil(dmax);
          else if (mode === 'fixed') max = Math.max(1, fixed || 40);
          else max = dmax * 1.08;
          if (max <= min + 0.0001) max = min + 1;
          step = niceCeil((max - min) / 4);
          if (max - min < step) step = niceCeil(max - min) || 1;
          return { min: min, max: max, step: step };
        }
        function refreshMenus(){
          var cor = (typeof wbChart !== 'undefined') && wbChart.metric === 'saved';
          if (cor) return; // corona menu handled by CHARTCTL
          var menu = document.querySelector('#wbChartCard .chart-menu');
          if (!menu) return;
          menu.querySelectorAll('.c-row').forEach(function(r){ r.classList.toggle('active', r.getAttribute('data-mode') === mode); });
          var fix = menu.querySelector('.c-fixed'); if (fix) fix.classList.toggle('show', mode === 'fixed');
          var inp = menu.querySelector('input[type=range]'); if (inp) inp.value = fixed;
          var val = menu.querySelector('.c-fixed-val'); if (val) val.textContent = fixed;
        }
        function toggleMenu(btn){
          var wrap = btn.closest('.c-settings');
          var menu = wrap ? wrap.querySelector('.chart-menu') : null;
          if (!menu) return;
          var isOpen = menu.classList.contains('open');
          document.querySelectorAll('.chart-menu').forEach(function(m){ m.classList.remove('open'); });
          if (!isOpen) menu.classList.add('open');
        }
        function pickMode(btn, m){
          mode = m; save();
          document.querySelectorAll('.chart-menu').forEach(function(menu){ menu.classList.remove('open'); });
          refreshMenus();
          if (typeof renderChartBox === 'function') renderChartBox('wb');
        }
        function setFixed(v){
          fixed = Math.max(1, parseInt(v,10) || 40); save();
          refreshMenus();
          if (typeof renderChartBox === 'function') renderChartBox('wb');
        }
        function replay(){
          var root = document.getElementById('wbChart');
          if (!root) return;
          root.querySelectorAll('svg .line-draw').forEach(function(p){
            var len = Math.max(1, p.getTotalLength());
            p.setAttribute('stroke-dasharray', len);
            p.setAttribute('stroke-dashoffset', len);
            p.classList.remove('draw');
            void p.getBoundingClientRect();
            p.classList.add('draw');
          });
        }
        setTimeout(function(){ try { refreshMenus(); } catch(e){} }, 400);
        return { mode:function(){ return mode; }, fixed:function(){ return fixed; }, domain:domain, toggleMenu:toggleMenu, pickMode:pickMode, setFixed:setFixed, replay:replay, refreshMenus:refreshMenus };
      })();

      // ── CHARTCTL — unified chart controls (play + gear) for corona AND line charts ──
      // Corona (dashboard always; word bank 'saved'): Auto / Fissa = zoom in/out clamped to the box.
      // Line charts (word bank 'words'/'lexdiv'): Auto / Fissa = y-axis max — delegates to YAXIS.
      // ── CHARTCTL — chart controls for LINE charts only (corona = static, no animation, no play/gear) ──
      // Line charts (word bank 'words'/'lexdiv'): Auto / Fissa = y-axis max — delegates to YAXIS.
      // Corona (dashboard always; word bank 'saved'): rendered static, controls hidden.
      window.CHARTCTL = (function(){
        function isCorona(scope){ return scope !== 'wb' || wbChart.metric === 'saved'; }
        function chartElFor(scope){ return document.getElementById(scope === 'wb' ? 'wbChart' : 'dailyChart'); }
        function syncControls(scope){
          var ctl = scope === 'wb' ? document.querySelector('#wbChartCard .chart-controls') : null;
          if (ctl) ctl.style.display = isCorona(scope) ? 'none' : 'flex';
        }
        function animateChart(chartEl){
          if (!chartEl) return;
          var svg = chartEl.querySelector('svg');
          if (!svg) return;
          if (!svg.querySelector('.line-draw')) return; // corona: static, no animation
          svg.querySelectorAll('.line-draw').forEach(function(p){
            var len = Math.max(1, p.getTotalLength());
            p.setAttribute('stroke-dasharray', len);
            p.setAttribute('stroke-dashoffset', len);
            p.classList.remove('draw'); void p.getBoundingClientRect(); p.classList.add('draw');
          });
        }
        function replay(scope){ if (!isCorona(scope)) animateChart(chartElFor(scope)); }
        function toggleMenu(btn){
          var wrap = btn.closest('.c-settings');
          var menu = wrap ? wrap.querySelector('.chart-menu') : null;
          if (!menu) return;
          var isOpen = menu.classList.contains('open');
          document.querySelectorAll('.chart-menu').forEach(function(m){ m.classList.remove('open'); });
          if (!isOpen) menu.classList.add('open');
        }
        function pickMode(btn, scope, mode){
          document.querySelectorAll('.chart-menu').forEach(function(m){ m.classList.remove('open'); });
          if (isCorona(scope)) return;
          if (typeof YAXIS !== 'undefined' && YAXIS.pickMode) YAXIS.pickMode(btn, mode);
        }
        function setFixed(input, scope){
          if (isCorona(scope)) return;
          if (typeof YAXIS !== 'undefined') YAXIS.setFixed(parseInt(input.value,10));
        }
        function refreshMenus(scope){
          syncControls(scope);
          if (isCorona(scope)) return; // corona has no settings menu
          var menu = scope === 'wb' ? document.querySelector('#wbChartCard .chart-menu') : document.querySelector('#dailyChartCard .chart-menu');
          if (!menu) return;
          var ym = (typeof YAXIS !== 'undefined' && YAXIS.mode) ? YAXIS.mode() : 'auto';
          var yf = (typeof YAXIS !== 'undefined' && YAXIS.fixed) ? YAXIS.fixed() : 40;
          menu.querySelectorAll('.c-row').forEach(function(r){ r.classList.toggle('active', r.getAttribute('data-mode') === ym); });
          var fix = menu.querySelector('.c-fixed'); if (fix) fix.classList.toggle('show', ym === 'fixed');
          var inp = menu.querySelector('input[type=range]'); if (inp) inp.value = yf;
          var val = menu.querySelector('.c-fixed-val'); if (val) val.textContent = yf;
        }
        function afterRender(scope){ refreshMenus(scope); if (!isCorona(scope)) animateChart(chartElFor(scope)); }
        setTimeout(function(){ try { refreshMenus('dash'); refreshMenus('wb'); } catch(e){} }, 400);
        return { isCorona: isCorona, replay: replay, toggleMenu: toggleMenu, pickMode: pickMode, setFixed: setFixed, refreshMenus: refreshMenus, afterRender: afterRender };
      })();

      // ── SVG builders (mockup-style charts: spline uniche/totali+neon salvate, corona 3 anelli, spline diversità) ──
      // Axis label formatter: decimals for small values (no duplicate labels when data is tiny), fmtK above 10.
      function fmtAxis(v){ if (v < 10) { return (Math.round(v*10)/10).toFixed(1).replace('.',',').replace(',0',''); } return fmtK(v); }
      function svgGrid2(d){
        // d = {min,max,step} y-axis domain (from YAXIS mode: Auto / Top pulito / Fissa).
        // Gridlines at NICE steps so labels stay clean and the top value sits near the top.
        var W=CHT.W,H=WBH,PL=CHT.PL,PR=CHT.PR,PT=CHT.PT,PB=CHT.PB,IH=H-PT-PB,g='',AX='#94a3b8';
        d = d || { min:0, max:1, step:1 };
        var span = (d.max - d.min) || 1;
        var v;
        for (v = d.min; v <= d.max + d.step*1e-6; v += d.step){
          var y = PT+IH-((v-d.min)/span)*IH, lbl = fmtAxis(Math.round(v*1000)/1000);
          g+='<line x1="'+PL+'" y1="'+y+'" x2="'+(W-PR)+'" y2="'+y+'" stroke="var(--line)" opacity=".6"/><text x="'+(PL-6)+'" y="'+(y+3)+'" text-anchor="end" fill="var(--text-faint)" font-size="9">'+lbl+'</text>';
        }
        g+='<line x1="'+PL+'" y1="'+PT+'" x2="'+PL+'" y2="'+(PT+IH)+'" stroke="'+AX+'" stroke-width="1.4" opacity=".8"/>';
        g+='<line x1="'+PL+'" y1="'+(PT+IH)+'" x2="'+(W-PR)+'" y2="'+(PT+IH)+'" stroke="'+AX+'" stroke-width="1.4" opacity=".8"/>';
        return g;
      }
      function shortDate(iso){ var p=(iso||'').split('-'); return p.length===3 ? p[2]+'/'+p[1] : iso; }
      function svgXLbl(days){
        var W=CHT.W,H=WBH,PL=CHT.PL,PR=CHT.PR,PT=CHT.PT,PB=CHT.PB,IW=W-PL-PR,n=days.length,g='';
        if (n===1){ g+='<text x="'+(W/2)+'" y="'+(H-6)+'" text-anchor="middle" fill="var(--text-faint)" font-size="9">Ieri</text>'; return g; }
        var idxs=[0,Math.floor((n-1)/2),n-1];
        idxs.forEach(function(i){ var lbl=(i===n-1)?'Oggi':shortDate(days[i]); g+='<text x="'+(PL+(IW*(i/(n-1))))+'" y="'+(H-6)+'" text-anchor="middle" fill="var(--text-faint)" font-size="9">'+lbl+'</text>'; });
        return g;
      }
      function svgLegend(items, up){
        var PL=CHT.PL,H=CHT.H,lx=PL+8,g=''; up = (up==null) ? 30 : up;
        items.forEach(function(l){ g+='<rect x="'+lx+'" y="'+(H-up)+'" width="10" height="10" rx="3" fill="'+l[0]+'"/><text x="'+(lx+13)+'" y="'+(H-up+10)+'" fill="var(--text-faint)" font-size="8.5">'+l[1]+'</text>'; lx+=13+6+6+l[1].length*5.5; });
        return g;
      }
      function splineWords3Html(days, data){
        var W=CHT.W,H=WBH,PL=CHT.PL,PR=CHT.PR,PT=CHT.PT,PB=CHT.PB,IW=W-PL-PR,IH=H-PT-PB,n=days.length;
        var u=[],t=[],sv=[]; days.forEach(function(iso){ var v=wordDayValue(days,data,iso); u.push(v.uniq); t.push(v.tt); sv.push(v.sv); });
        var dataMax=Math.max.apply(null,t.concat([1]));
        var d = window.YAXIS ? window.YAXIS.domain(dataMax) : { min:0, max:dataMax*1.08, step:niceCeil(dataMax*1.08/4) };
        var span=(d.max-d.min)||1;
        function px(i){ return PL+(IW*(i/(Math.max(1,n-1)))); } function py(v){ return PT+IH-((v-d.min)/span)*IH; }
        function sm(vals){ var pts=vals.map(function(v,i){ return [px(i),py(v)]; }),d='M'+pts[0][0]+' '+pts[0][1]; for(var i=0;i<pts.length-1;i++){ var p0=pts[Math.max(0,i-1)],p1=pts[i],p2=pts[i+1],p3=pts[Math.min(pts.length-1,i+2)],c1x=p1[0]+(p2[0]-p0[0])/6,c1y=p1[1]+(p2[1]-p0[1])/6,c2x=p2[0]-(p3[0]-p1[0])/6,c2y=p2[1]-(p3[1]-p1[1])/6; d+=' C'+c1x+' '+c1y+', '+c2x+' '+c2y+', '+p2[0]+' '+p2[1]; } return d; }
        var g=svgGrid2(d);
        g+='<path class="chart-line" d="'+sm(t)+'" fill="none" stroke="#64748b" stroke-width="2.2" opacity=".5"/>';
        g+='<path class="line-draw" d="'+sm(u)+'" fill="none" stroke="#34d399" stroke-width="2.6" stroke-linecap="round"/>';
        g+='<path class="line-draw" d="'+sm(sv)+'" fill="none" stroke="#fbbf24" stroke-width="3.2" stroke-linecap="round" style="filter:drop-shadow(0 0 10px rgba(251,191,36,.95))"/>';
        u.forEach(function(v,i){ var yy=py(v), ly=(yy-11<16)?yy+15:yy-11; g+='<g class="vg"><circle class="dot" cx="'+px(i)+'" cy="'+yy+'" r="3.6" fill="var(--bg)" stroke="#34d399" stroke-width="2"><title>'+days[i]+' — '+v+' uniche</title></circle><text class="vlab" x="'+px(i)+'" y="'+ly+'" text-anchor="middle" fill="#34d399" font-size="10.5" font-weight="800">'+fmtK(v)+'</text></g>'; });
        sv.forEach(function(v,i){ g+='<g class="vg"><circle class="dot dotN" cx="'+px(i)+'" cy="'+py(v)+'" r="3.2" fill="var(--bg)" stroke="#fbbf24" stroke-width="2"><title>'+days[i]+' — '+v+' salvate</title></circle></g>'; });
        g+=svgXLbl(days);
        return '<svg viewBox="0 0 '+W+' '+H+'" style="width:100%;max-width:560px;height:auto">'+g+'</svg>';
      }
      function radial3Html(days, data){
        var W=CHT.W,H=WBH,PL=CHT.PL,PR=CHT.PR,PT=CHT.PT,PB=CHT.PB,cx=W/2,cy=H/2,n=days.length,step=n?360/n:1,g='';
        var names={sv:'salvate',pr:'praticate',cf:'confermate'};
        var bands=[{key:'sv',c:'#fbbf24',hi:'#fcd34d',r0:28,r1:48},{key:'pr',c:'#34d399',hi:'#6ee7b7',r0:52,r1:72},{key:'cf',c:'#8b5cf6',hi:'#a78bfa',r0:76,r1:100}];
        bands.forEach(function(b){
          var vals=days.map(function(iso){ return wordDayValue(days,data,iso)[b.key]; });
          var max=Math.max.apply(null,vals.concat([1]));
          for(var i=0;i<n;i++){ var v=vals[i],a0=i*step,a1=(i+1)*step-4,rr=b.r0+(v/max)*(b.r1-b.r0);
            if (v>0) g+='<path d="'+ringPath(cx,cy,rr,b.r0,a0,a1)+'" fill="'+(i===n-1?b.hi:b.c)+'" opacity=".95"><title>'+days[i]+' — '+v+' '+names[b.key]+'</title></path>'; }
        });
        for (var r2=0;r2<bands.length;r2++){ g+='<circle cx="'+cx+'" cy="'+cy+'" r="'+bands[r2].r1+'" fill="none" stroke="var(--line)"/>'; }
        var tot=0; days.forEach(function(iso){ tot += (data.savedByDay[iso]||0); });
        var est=String(fmtK(tot)).length, fs=Math.max(14,Math.min(30,Math.floor((2*bands[0].r0-8)/(est*0.62))));
        g+='<text class="corona-val" data-num="'+tot+'" data-fmt="k" x="'+cx+'" y="'+(cy+fs*0.35)+'" text-anchor="middle" fill="var(--text)" font-size="'+fs+'" font-weight="800" font-family="Inter, sans-serif" letter-spacing="-0.02em">'+fmtK(tot)+'</text>';
        g+='<text x="'+cx+'" y="'+(cy+16)+'" text-anchor="middle" fill="var(--text-faint)" font-size="8" font-weight="700" letter-spacing=".1em">SAVED</text>';
        return '<svg viewBox="0 0 '+W+' '+H+'" style="width:100%;max-width:680px;height:auto">'+g+'</svg>';
      }
      function splineTwoHtml(days, data){
        var W=CHT.W,H=WBH,PL=CHT.PL,PR=CHT.PR,PT=CHT.PT,PB=CHT.PB,IW=W-PL-PR,IH=H-PT-PB,n=days.length;
        var u=[],t=[]; days.forEach(function(iso){ var v=wordDayValue(days,data,iso); u.push(v.uniq); t.push(v.tt); });
        var dataMax=Math.max.apply(null,t.concat([1]));
        var d = window.YAXIS ? window.YAXIS.domain(dataMax) : { min:0, max:dataMax*1.08, step:niceCeil(dataMax*1.08/4) };
        var span=(d.max-d.min)||1;
        function px(i){ return PL+(IW*(i/(Math.max(1,n-1)))); } function py(v){ return PT+IH-((v-d.min)/span)*IH; }
        function sm(vals){ var pts=vals.map(function(v,i){ return [px(i),py(v)]; }),d='M'+pts[0][0]+' '+pts[0][1]; for(var i=0;i<pts.length-1;i++){ var p0=pts[Math.max(0,i-1)],p1=pts[i],p2=pts[i+1],p3=pts[Math.min(pts.length-1,i+2)],c1x=p1[0]+(p2[0]-p0[0])/6,c1y=p1[1]+(p2[1]-p0[1])/6,c2x=p2[0]-(p3[0]-p1[0])/6,c2y=p2[1]-(p3[1]-p1[1])/6; d+=' C'+c1x+' '+c1y+', '+c2x+' '+c2y+', '+p2[0]+' '+p2[1]; } return d; }
        var g=svgGrid2(d);
        g+='<path class="chart-line" d="'+sm(t)+'" fill="none" stroke="#64748b" stroke-width="2.2" opacity=".6"/>';
        g+='<path class="line-draw" d="'+sm(u)+'" fill="none" stroke="#8b5cf6" stroke-width="2.8" stroke-linecap="round" style="filter:drop-shadow(0 0 8px rgba(139,92,246,.45))"/>';
        u.forEach(function(v,i){ var yy=py(v), ly=(yy-11<16)?yy+15:yy-11; g+='<g class="vg"><circle class="dot" cx="'+px(i)+'" cy="'+yy+'" r="4.2" fill="var(--bg)" stroke="#8b5cf6" stroke-width="2"><title>'+days[i]+' — '+v+' uniche</title></circle><text class="vlab" x="'+px(i)+'" y="'+ly+'" text-anchor="middle" fill="#8b5cf6" font-size="10.5" font-weight="800">'+fmtK(v)+'</text></g>'; });
        g+=svgXLbl(days);
        return '<svg viewBox="0 0 '+W+' '+H+'" style="width:100%;max-width:560px;height:auto">'+g+'</svg>';
      }
      function wordChartHtml(m, days, data, isEn){
        if (m === 'saved') return radial3Html(days, data);
        if (m === 'lexdiv') return splineTwoHtml(days, data);
        return splineWords3Html(days, data);
      }
      function animateLineDraw(){
        var root = document.getElementById('wbChart');
        if (!root) return;
        root.querySelectorAll('svg .line-draw').forEach(function(p){
          var len = Math.max(1, p.getTotalLength());
          p.setAttribute('stroke-dasharray', len);
          p.setAttribute('stroke-dashoffset', len);
          p.classList.remove('draw');
          void p.getBoundingClientRect();
          p.classList.add('draw');
        });
      }
      function dashPeriodLabel(tl, isEn){
        var m = { week:['Ultima settimana','Last week'], '2week':['Ultime 2 settimane','Last 2 weeks'], month:['Ultimo mese','Last month'], all:['Tutto','All time'] };
        return (m[tl]||m.week)[isEn?1:0];
      }
      function polarC(cx,cy,r,deg){ var a=(deg-90)*Math.PI/180; return [cx+r*Math.cos(a), cy+r*Math.sin(a)]; }
      function ringPath(cx,cy,rO,rI,a0,a1){
        var p0=polarC(cx,cy,rO,a0), p1=polarC(cx,cy,rO,a1), p2=polarC(cx,cy,rI,a1), p3=polarC(cx,cy,rI,a0), la=(a1-a0)>180?1:0;
        return 'M'+p0[0]+' '+p0[1]+' A'+rO+' '+rO+' 0 '+la+' 1 '+p1[0]+' '+p1[1]+' L'+p2[0]+' '+p2[1]+' A'+rI+' '+rI+' 0 '+la+' 0 '+p3[0]+' '+p3[1]+' Z';
      }
      function fmtDate(iso, isEn){
        if (!iso) return '';
        try { var d = new Date(iso + 'T00:00:00'); return d.toLocaleDateString(isEn ? 'en-GB' : 'it-IT', { weekday:'short', day:'numeric', month:'short' }); } catch(e){ return iso; }
      }
      function escAttr(s){ return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }
      function dashDay(iso, data){
        var o = { count:0, rec:0, bands:[0,0,0,0] };
        for (var i=0;i<data.sessions.length;i++){ var s=data.sessions[i]; if (s.iso === iso){ o.count++; o.rec += s.m; var h=s.h; if (h<6) o.bands[3]+=s.m; else if (h<12) o.bands[0]+=s.m; else if (h<18) o.bands[1]+=s.m; else o.bands[2]+=s.m; } }
        var site = (data.siteMap && data.siteMap[iso]) || 0;
        o.site = Math.round(site);
        o.extra = Math.max(0, o.site - o.rec);
        return o;
      }
      function dashLegendHtml(items, isEn){
        return '<div style="display:flex;flex-wrap:wrap;gap:14px;justify-content:center;align-items:center">' + items.map(function(l){
          return '<span style="display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:600;color:var(--text-soft);font-family:Inter,sans-serif;line-height:1"><span style="width:10px;height:10px;border-radius:3px;background:'+l[0]+';display:inline-block;flex-shrink:0"></span>'+l[1]+'</span>';
        }).join('') + '</div>';
      }
      function bindDashChartTip(chartEl){
        if (!chartEl) return;
        var tip = chartEl.querySelector('#dashTip');
        if (!tip) { tip = document.createElement('div'); tip.id='dashTip'; tip.style.cssText='position:absolute;pointer-events:none;opacity:0;transition:opacity .15s;background:var(--panel-2);border:1px solid var(--line);border-radius:10px;padding:7px 11px;font-size:11px;color:var(--text);font-family:Inter,sans-serif;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,.18);z-index:50;white-space:nowrap'; chartEl.appendChild(tip); }
        chartEl.onmousemove = function(e){
          var t = e.target && e.target.closest ? e.target.closest('[data-tip]') : null;
          if (t && t.getAttribute && t.getAttribute('data-tip')) {
            var r = chartEl.getBoundingClientRect();
            tip.innerHTML = t.getAttribute('data-tip');
            tip.style.opacity = '1';
            tip.style.left = Math.max(0, Math.min(r.width - tip.offsetWidth - 8, (e.clientX - r.left) + 14)) + 'px';
            tip.style.top = Math.max(0, Math.min(r.height - tip.offsetHeight - 8, (e.clientY - r.top) + 16)) + 'px';
          } else { tip.style.opacity = '0'; }
        };
        chartEl.onmouseleave = function(){ if (tip) tip.style.opacity = '0'; };
      }
      // ═══ CORONA — single colour (sessions), enlarged to fill the box ═══
      function coronaHtml(vals, center, color, unit, days){
        var W=760,H=240,cx=W/2,cy=H/2,n=vals.length||1,max=Math.max.apply(null,vals.concat([1]));
        var est=String(center).length, r0=Math.max(38,Math.min(64,14+est*4)), span=Math.min(H/2-10, r0+95), ringH=(span-r0)/4;
        var fs=Math.max(15,Math.min(34,Math.floor((2*r0-16)/(est*0.62)))), step=360/n, g='';
        for (var ring=1;ring<=4;ring++) g+='<circle cx="'+cx+'" cy="'+cy+'" r="'+(r0+ring*ringH)+'" fill="none" stroke="var(--line)"/>';
        var tot=0;
        for (var i=0;i<n;i++){ var v=vals[i], a0=i*step, a1=(i+1)*step-4, rr=r0+(v/max)*(span-r0), d=days&&days[i]?days[i]:'';
          tot+=(v||0);
          g+='<path data-tip="'+escAttr(fmtDate(d)+' — '+(v||0)+' '+(unit||''))+'" d="'+ringPath(cx,cy,rr,r0,a0,a1)+'" fill="'+(i===n-1?'#f59e0b':color)+'" opacity=".95"></path>'; }
        g+='<text class="corona-val" data-num="'+tot+'" data-fmt="int" x="'+cx+'" y="'+(cy+fs*0.35)+'" text-anchor="middle" fill="var(--text)" font-size="'+fs+'" font-weight="800" font-family="Inter, sans-serif" letter-spacing="-0.02em">'+center+'</text>';
        return '<svg viewBox="0 0 '+W+' '+H+'" style="width:100%;max-width:680px;height:auto">'+g+'</svg>';
      }
      // ═══ CORONA DUAL — activity: recording (cyan) + extra site time (amber) ═══
      function coronaDualHtml(recVals, extraVals, center, unit, days){
        var W=760,H=240,cx=W/2,cy=H/2,n=recVals.length||1,max=0,i;
        for(i=0;i<n;i++){ var tt=recVals[i]+extraVals[i]; if(tt>max)max=tt; } max=max||1;
        var est=String(center).length, r0=Math.max(38,Math.min(64,14+est*4)), span=Math.min(H/2-10, r0+95), ringH=(span-r0)/4;
        var fs=Math.max(15,Math.min(34,Math.floor((2*r0-16)/(est*0.62)))), step=360/n, g='';
        for (var ring=1;ring<=4;ring++) g+='<circle cx="'+cx+'" cy="'+cy+'" r="'+(r0+ring*ringH)+'" fill="none" stroke="var(--line)"/>';
        var tot=0;
        for(i=0;i<n;i++){
          var rec=recVals[i], ex=extraVals[i], site=rec+ex, a0=i*step, a1=(i+1)*step-4, d=days&&days[i]?days[i]:'';
          tot+=site;
          var rRec=r0+(rec/max)*(span-r0), rSite=r0+(site/max)*(span-r0), isT=(i===n-1);
          var tip=escAttr(fmtDate(d)+' · registrazione '+fmtMinutes(Math.round(rec))+' · altro '+fmtMinutes(Math.round(ex))+' · totale '+fmtMinutes(Math.round(site)));
          g+='<path data-tip="'+tip+'" d="'+ringPath(cx,cy,rRec,r0,a0,a1)+'" fill="'+(isT?'#22d3ee':'#06b6d4')+'" opacity=".95"></path>';
          if (ex>0) g+='<path data-tip="'+tip+'" d="'+ringPath(cx,cy,rSite,rRec,a0,a1)+'" fill="'+(isT?'#fbbf24':'#f59e0b')+'" opacity=".95"></path>';
        }
        g+='<text class="corona-val" data-num="'+tot+'" data-fmt="min" x="'+cx+'" y="'+(cy+fs*0.35)+'" text-anchor="middle" fill="var(--text)" font-size="'+fs+'" font-weight="800" font-family="Inter, sans-serif" letter-spacing="-0.02em">'+center+'</text>';
        return '<svg viewBox="0 0 '+W+' '+H+'" style="width:100%;max-width:680px;height:auto">'+g+'</svg>';
      }
      // ═══ STACKED BANDS — time of day: morning/day/evening/night per day ═══
      // ═══ CORONA BANDS — time of day: each day is a stack, morning centre → night outside ═══
      function coronaBandsHtml(bandsArr, days){
        var W=CHT.W,H=CHT.H,PL=CHT.PL,PR=CHT.PR,PT=CHT.PT,PB=CHT.PB,cx=W/2,cy=H/2,n=bandsArr.length,step=n?360/n:1,g='';
        var bands=[
          {name:'Mattina',c:'#fbbf24',hi:'#fcd34d',r0:20,r1:40},
          {name:'Giorno', c:'#22d3ee',hi:'#67e8f9',r0:44,r1:64},
          {name:'Sera',   c:'#8b5cf6',hi:'#a78bfa',r0:68,r1:88},
          {name:'Notte',  c:'#6366f1',hi:'#818cf8',r0:92,r1:112}
        ];
        for (var bi=0;bi<4;bi++){
          var b=bands[bi], vals=[];
          for (var i=0;i<n;i++) vals.push(bandsArr[i]?bandsArr[i][bi]:0);
          var max=Math.max.apply(null,vals.concat([1]));
          for (var i2=0;i2<n;i2++){
            var v=vals[i2], a0=i2*step, a1=(i2+1)*step-4, rr=b.r0+(v/max)*(b.r1-b.r0), d=days&&days[i2]?days[i2]:'';
            var tip=escAttr(fmtDate(d)+' · Mattina '+fmtMinutes(Math.round(bandsArr[i2][0]))+' · Giorno '+fmtMinutes(Math.round(bandsArr[i2][1]))+' · Sera '+fmtMinutes(Math.round(bandsArr[i2][2]))+' · Notte '+fmtMinutes(Math.round(bandsArr[i2][3])));
            if (v>0) g+='<path data-tip="'+tip+'" d="'+ringPath(cx,cy,rr,b.r0,a0,a1)+'" fill="'+(i2===n-1?b.hi:b.c)+'" opacity=".95"></path>';
          }
        }
        for (var r2=0;r2<bands.length;r2++){ g+='<circle cx="'+cx+'" cy="'+cy+'" r="'+bands[r2].r1+'" fill="none" stroke="var(--line)"/>'; }
        var tot=0; for (var j=0;j<n;j++) for (var s=0;s<4;s++) tot+=(bandsArr[j]?bandsArr[j][s]:0);
        var est=String(fmtMinutes(tot)).length, fs=Math.max(14,Math.min(30,Math.floor((2*bands[0].r0-8)/(est*0.62))));
        g+='<text class="corona-val" data-num="'+tot+'" data-fmt="min" x="'+cx+'" y="'+(cy+fs*0.35)+'" text-anchor="middle" fill="var(--text)" font-size="'+fs+'" font-weight="800" font-family="Inter, sans-serif" letter-spacing="-0.02em">'+fmtMinutes(tot)+'</text>';
        return '<svg viewBox="0 0 '+W+' '+H+'" style="width:100%;max-width:680px;height:auto">'+g+'</svg>';
      }
      async function renderChartBox(scope){
        var st = scope === 'wb' ? wbChart : dashChart;
        var ids = chartIds(scope);
        var chartEl = document.getElementById(ids.chart), totalEl = document.getElementById(ids.total),
            titleEl = document.getElementById(ids.title), subEl = document.getElementById(ids.sub),
            plEl = document.getElementById(ids.pl), mediaEl = document.getElementById(ids.media), mlEl = document.getElementById(ids.ml);
        if (!chartEl) return;
        var isEn = window.I18n && I18n.getLang() === 'en';
        if (scope === 'wb' && (st.metric === 'words' || st.metric === 'saved' || st.metric === 'lexdiv')) {
          var wdata = await loadWordChartData();
          var wdays = wordDays(st.tl, wdata);
          var wo = wordAggregate(wdays, wdata);
          var wm = wordMeta(st.metric, isEn);
          if (titleEl) titleEl.textContent = wm.title;
          if (subEl) subEl.textContent = wm.sub;
          if (totalEl) totalEl.textContent = wm.big(wo);
          if (plEl) plEl.textContent = dashPeriodLabel(st.tl, isEn);
          if (mediaEl) mediaEl.textContent = wm.media(wo);
          if (mlEl) mlEl.textContent = wm.mediaLabel;
          chartEl.innerHTML = '<div class="cc-wrap" style="width:100%;display:flex;justify-content:center">' + wordChartHtml(st.metric, wdays, wdata, isEn) + '</div>';
          CHARTCTL.afterRender('wb');
          // Legend: centered under a divider below the chart (not inside the SVG)
          var wbLgEl = document.getElementById('wbChartLegend');
          if (wbLgEl) {
            var wbLgItems = st.metric === 'words'
              ? [['#fbbf24', isEn?'Saved':'Salvate'], ['#34d399', isEn?'Unique':'Uniche'], ['#64748b', isEn?'Total':'Totali']]
              : st.metric === 'saved'
                ? [['#fbbf24', isEn?'Saved':'Salvate'], ['#34d399', isEn?'Practiced':'Praticate'], ['#8b5cf6', isEn?'Confirmed':'Confermate']]
                : [['#8b5cf6', isEn?'Unique':'Uniche'], ['#64748b', isEn?'Total':'Totali']];
            wbLgEl.innerHTML = wbLgItems.map(function(l){
              return '<span style="display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:var(--text-soft)"><span style="width:10px;height:10px;border-radius:3px;background:'+l[0]+'"></span>'+l[1]+'</span>';
            }).join('');
          }
          return;
        }
        var meta = {
          totalSessions:{ title: isEn?'Sessions':'Sessioni', sub: isEn?'Training sessions per day — corona for every period.':'Sessioni di allenamento per giorno — corona per ogni periodo.', color:'var(--cyan)', unit: isEn?'sessions':'sessioni', fmt:function(v){ return ''+v; } },
          totalMinutes:{ title: isEn?'Activity':'Attività', sub: isEn?'Minutes on site per day: recording (spoken time) + extra time on the site.':'Minuti sul sito per giorno: registrazione (tempo parlato) + altro tempo sul sito.', color:'var(--cyan)', unit: isEn?'min':'min', fmt:fmtMinutes },
          timebands:{ title: isEn?'Time of day':'Fasce orarie', sub: isEn?'Recording minutes per day, split by time of day (morning / day / evening / night).':'Minuti di registrazione per giorno, divisi per fascia oraria (mattina / giorno / sera / notte).', color:'var(--accent-purple)', unit: isEn?'min':'min', fmt:fmtMinutes }
        }[st.metric] || {};
        if (titleEl) titleEl.textContent = meta.title || '';
        if (subEl) subEl.textContent = meta.sub || '';
        var data = await loadDashChartData();
        var days = chartBoxDays(st.tl, data);
        var dayData = days.map(function(iso){ return dashDay(iso, data); });
        var chartSvg = '', legendItems = [], total = 0, media = 0;
        if (st.metric === 'totalSessions') {
          var vals = dayData.map(function(d){ return d.count; });
          total = vals.reduce(function(s,v){ return s+v; }, 0);
          media = days.length ? total/days.length : 0;
          if (totalEl) totalEl.textContent = '' + total;
          if (mediaEl) mediaEl.textContent = media.toFixed(1);
          chartSvg = coronaHtml(vals, ''+total, 'var(--cyan)', isEn?'sessions':'sessioni', days);
          legendItems = [['var(--cyan)', isEn?'sessions':'sessioni']];
        } else if (st.metric === 'totalMinutes') {
          var recVals = dayData.map(function(d){ return d.rec; });
          var extraVals = dayData.map(function(d){ return d.extra; });
          total = 0; for (var i=0;i<dayData.length;i++) total += (dayData[i].site||0);
          media = days.length ? total/days.length : 0;
          if (totalEl) totalEl.textContent = fmtMinutes(total);
          if (mediaEl) mediaEl.textContent = fmtMinutes(Math.round(media));
          chartSvg = coronaDualHtml(recVals, extraVals, fmtMinutes(total), 'min', days);
          legendItems = [['#06b6d4', isEn?'recording':'registrazione'], ['#f59e0b', isEn?'extra time on site':'altro tempo sul sito']];
        } else {
          var bandsArr = dayData.map(function(d){ return d.bands; });
          total = 0; for (var j=0;j<dayData.length;j++) total += (dayData[j].rec||0);
          media = days.length ? total/days.length : 0;
          if (totalEl) totalEl.textContent = fmtMinutes(total);
          if (mediaEl) mediaEl.textContent = fmtMinutes(Math.round(media));
          chartSvg = coronaBandsHtml(bandsArr, days);
          legendItems = [['#fbbf24', isEn?'Morning':'Mattina'], ['#22d3ee', isEn?'Day':'Giorno'], ['#8b5cf6', isEn?'Evening':'Sera'], ['#6366f1', isEn?'Night':'Notte']];
        }
        if (plEl) plEl.textContent = dashPeriodLabel(st.tl, isEn);
        if (mlEl) mlEl.textContent = isEn ? 'avg / day' : 'media/giorno';
        chartEl.innerHTML = '<div class="cc-wrap" style="width:100%;display:flex;justify-content:center">' + chartSvg + '</div>';
        bindDashChartTip(chartEl);
        CHARTCTL.afterRender('dash');
        if (ids.legend) { var legendEl = document.getElementById(ids.legend); if (legendEl) legendEl.innerHTML = dashLegendHtml(legendItems, isEn); }
      }
      function dashSetTl(btn, scope){
        var st = scope === 'wb' ? wbChart : dashChart;
        st.tl = btn.getAttribute('data-tl');
        btn.parentNode.querySelectorAll('.ds-btn, .wb-chart-btn').forEach(function(b){ b.classList.toggle('active', b === btn); });
        renderChartBox(scope);
        if (scope === 'wb') updateWbVsBoxes();
      }
      function wbSelectBox(el){
        wbChart.metric = el.getAttribute('data-metric') || 'words';
        document.querySelectorAll('#wbOvStatsRow > div').forEach(function(d){ d.style.borderColor=''; });
        el.style.borderColor = 'var(--cyan)';
        renderChartBox('wb');
      }
      window.dashSetTl = dashSetTl;
      window.wbSelectBox = wbSelectBox;
      window.renderChartBox = renderChartBox;
      window.loadDashChartData = loadDashChartData;

      // ═══ RENDER: Daily chart — 14-day data for selected metric ═══
      async function renderDailyChart(metric, cardNumber) {
        var container = document.getElementById('dailyChart');
        var totalEl = document.getElementById('dailyChartTotal');
        var titleEl = document.getElementById('dailyChartTitle');
        var subtitleEl = document.getElementById('dailyChartSubtitle');
        var labelEl = document.getElementById('dailyChartLabel');
        if (!container) return;

        // Metric display config (bilingual)
        var isEn = window.I18n && I18n.getLang() === 'en';
        var mc = {};
        mc.totalSessions = { title: isEn?'Total sessions':'Sessioni totali', subtitle: isEn?'Sessions completed in the last 14 days.':'Numero di sessioni completate negli ultimi 14 giorni.', label: isEn?'Total Sessions':'Sessioni Totali', unit:'' };
        mc.totalMinutes  = { title: isEn?'Session minutes':'Minuti di sessione', subtitle: isEn?'Your speaking consistency over the last 14 days.':'Analisi della tua costanza verbale negli ultimi 14 giorni.', label: isEn?'Total Minutes':'Minuti Totali', unit:' min' };
        mc.totalWords    = { title: isEn?'Unique words':'Parole uniche', subtitle: isEn?'Distinct words used in the last 14 days.':'Parole distinte usate nelle sessioni degli ultimi 14 giorni.', label: isEn?'Total Words':'Parole Totali', unit:'' };
        mc.avgLexDiv     = { title: isEn?'Lexical diversity':'Diversit\u00E0 lessicale', subtitle: isEn?'Unique/total word ratio over the last 14 days.':'Rapporto parole uniche/totali negli ultimi 14 giorni.', label: isEn?'Avg Ratio':'Media Rapporto', unit:'',
          info: isEn ? 'Lexical diversity measures how varied your vocabulary is. It\u2019s calculated as: unique words \u00F7 total words per session. A higher ratio means you used a wider range of vocabulary. Typical values range from 0.3 (repetitive) to 0.9 (highly varied). Tracking this over time shows whether your active vocabulary is expanding.' : 'La diversit\u00E0 lessicale misura quanto \u00E8 vario il tuo vocabolario. Si calcola come: parole uniche \u00F7 parole totali per sessione. Un rapporto pi\u00F9 alto significa che hai usato una gamma pi\u00F9 ampia di vocaboli. I valori tipici vanno da 0,3 (ripetitivo) a 0,9 (molto vario). Monitorarlo nel tempo mostra se il tuo vocabolario attivo si sta espandendo.' };
        mc.timebands     = { title: isEn?'Recording by time of day':'Minuti per fascia oraria', subtitle: isEn?'Recording minutes per day, split by time of day (morning / day / evening / night).':'Minuti di registrazione per giorno, divisi per fascia oraria (mattina / giorno / sera / notte).', label: isEn?'Recording minutes':'Minuti di registrazione', unit:' min' };
        var metricConfig = mc;
        var cfg = metricConfig[metric] || metricConfig.totalMinutes;
        if (titleEl) { titleEl.textContent = cfg.title; titleEl.setAttribute('data-i18n', ''); }
        if (subtitleEl) { subtitleEl.textContent = cfg.subtitle; subtitleEl.setAttribute('data-i18n', ''); }
        // Info icon + collapsible explanation for GSE / Lexical Diversity
        var infoBox = document.getElementById('dailyChartInfoBox');
        if (cfg.info) {
          if (!infoBox) {
            infoBox = document.createElement('div');
            infoBox.id = 'dailyChartInfoBox';
            infoBox.style.cssText = 'display:none;margin-top:12px;padding:14px 18px;background:var(--bg);border:1px solid var(--line);border-radius:12px;font-size:13px;color:var(--text-soft);line-height:1.7;max-width:640px';
            subtitleEl.parentNode.insertBefore(infoBox, subtitleEl.nextSibling);
          }
          infoBox.textContent = cfg.info;
          // Show/hide icon
          var infoIcon = document.getElementById('dailyChartInfoIcon');
          if (!infoIcon) {
            infoIcon = document.createElement('span');
            infoIcon.id = 'dailyChartInfoIcon';
            infoIcon.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;border:1.5px solid var(--text-faint);color:var(--text-faint);font-size:11px;cursor:pointer;margin-left:10px;flex-shrink:0;transition:all .2s';
            infoIcon.innerHTML = '<i class="fa-solid fa-info" style="font-size:11px"></i>';
            infoIcon.title = isEn ? 'How is this calculated?' : 'Come si calcola?';
            infoIcon.onmouseover = function(){ this.style.borderColor='var(--cyan)'; this.style.color='var(--cyan)'; };
            infoIcon.onmouseout = function(){ if (!infoBox.style.display||infoBox.style.display==='none'){ this.style.borderColor='var(--text-faint)'; this.style.color='var(--text-faint)'; } };
            infoIcon.onclick = function(e){ e.stopPropagation(); var ib = document.getElementById('dailyChartInfoBox'); if(ib){ var isOpen = ib.style.display==='block'; ib.style.display = isOpen ? 'none' : 'block'; this.style.borderColor = isOpen ? 'var(--text-faint)' : 'var(--cyan)'; this.style.color = isOpen ? 'var(--text-faint)' : 'var(--cyan)'; } };
            subtitleEl.parentNode.insertBefore(infoIcon, subtitleEl.nextSibling);
          }
          infoIcon.style.display = 'inline-flex';
          if (infoBox) infoBox.style.display = 'none';
        } else {
          if (infoBox) infoBox.style.display = 'none';
          var infoIcon = document.getElementById('dailyChartInfoIcon');
          if (infoIcon) infoIcon.style.display = 'none';
        }
        if (labelEl) { labelEl.textContent = cfg.label; labelEl.setAttribute('data-i18n', ''); }

        try {
          var sb = window.sottotitoliSupabase;
          if (!sb) { container.innerHTML = '<span style="font-size:13px;color:var(--text-faint);align-self:center;width:100%;text-align:center">Accedi per vedere il grafico</span>'; return; }
          var r = await sb.auth.getSession();
          if (!r.data?.session) { container.innerHTML = '<span style="font-size:13px;color:var(--text-faint);align-self:center;width:100%;text-align:center">Accedi per vedere il grafico</span>'; return; }
          var userId = r.data.session.user.id;
          var lang = window.SOTTOTITOLI_STUDY_LANG || 'en';
          var now = new Date();
          var days = [];
          for (var d = 13; d >= 0; d--) {
            var date = new Date(now.getTime() - d * 86400000);
            days.push({ iso: date.toISOString().substring(0, 10), value: 0, sessions:0, minutes:0, words:0, wpmSum:0, wpmCount:0, lexDivSum:0, lexDivCount:0 });
          }
          var startDate = days[0].iso;
          var endDate = new Date(now.getTime() + 86400000).toISOString().substring(0, 10);
          var sRes = await sb.from('sessions').select('duration_seconds,words_count,wpm,lexical_diversity,started_at').eq('user_id', userId).like('language_pair', lang + '%').gte('started_at', startDate).lt('started_at', endDate).order('started_at');
          if (sRes.data) {
            sRes.data.forEach(function(s) {
              var dayIso = s.started_at.substring(0, 10);
              var day = days.find(function(d) { return d.iso === dayIso; });
              if (!day) return;
              day.sessions += 1;
              day.minutes += Math.round((s.duration_seconds || 0) / 60);
              day.words += (s.words_count || 0);
              if (s.wpm > 0) { day.wpmSum += s.wpm; day.wpmCount++; }
              if (s.lexical_diversity > 0) { day.lexDivSum += s.lexical_diversity; day.lexDivCount++; }
            });
          }

          // Compute the value for the selected metric per day
          days.forEach(function(d) {
            if (metric === 'totalSessions') d.value = d.sessions;
            else if (metric === 'totalMinutes') d.value = d.minutes;
            else if (metric === 'totalWords') d.value = d.words;
            else if (metric === 'avgLexDiv') d.value = d.lexDivCount > 0 ? Math.round(d.lexDivSum / d.lexDivCount * 100) / 100 : 0;
            else if (metric === 'timebands') d.value = d.minutes;
            else d.value = d.minutes;
          });

          var maxVal = Math.max.apply(null, days.map(function(d) { return d.value; })) || 1;
          var totalVal = days.reduce(function(s, d) { return s + d.value; }, 0);

          // GSE uses lexical diversity as daily proxy — show as chart like any metric
          if (totalEl) {
            // Use the card's displayed number for consistency
            if (cardNumber && cardNumber !== '—') {
              totalEl.textContent = cardNumber;
            } else if (metric === 'totalWords') {
              totalEl.textContent = totalVal > 999 ? (totalVal / 1000).toFixed(1) + 'k' : totalVal;
            } else if (metric === 'totalMinutes' || metric === 'timebands') {
              totalEl.textContent = fmtMinutes(totalVal);
            } else if (metric === 'avgLexDiv') {
              totalEl.textContent = (days.filter(function(d){return d.value>0;}).length > 0 ? (totalVal / days.filter(function(d){return d.value>0;}).length).toFixed(2) : '—');
            } else {
              totalEl.textContent = Math.round(totalVal);
            }
          }

          // Chart height fills the bento's chart area (was a fixed 182px)
          var _chartArea = document.getElementById('dailyChart');
          var chartH = (_chartArea && _chartArea.clientHeight) ? Math.max(120, _chartArea.clientHeight - 8) : 150;
          // Always rebuild bars from scratch for clean, consistent rendering
          var barHtml = '';
          days.forEach(function(day, idx) {
            var h = Math.max(4, Math.round((day.value / maxVal) * chartH));
            var isToday = idx === days.length - 1;
            var ratio = day.value / maxVal;
            var barBg;
            if (ratio === 0) barBg = 'var(--line)';
            else if (ratio < 0.15) barBg = 'rgba(6,182,212,.08)';
            else if (ratio < 0.35) barBg = 'rgba(6,182,212,.2)';
            else if (ratio < 0.6) barBg = 'rgba(6,182,212,.45)';
            else if (ratio < 0.8) barBg = 'rgba(6,182,212,.6)';
            else barBg = 'rgba(6,182,212,.75)';
            var barColor = isToday ? '#F59E0B' : barBg;
            var barHover = isToday ? '#FAB73D' : 'rgba(6,182,212,.8)';
            var barGlow = isToday ? '0 0 25px rgba(245,158,11,.3)' : (ratio >= 0.8 ? '0 0 20px rgba(6,182,212,.2)' : 'none');
            var tooltip = fmtDate(day.iso) + ' \u2014 ' + (metric==='avgLexDiv'?day.value.toFixed(2):Math.round(day.value)) + cfg.unit;
            barHtml += '<div class="chart-bar" style="flex:1;display:flex;align-items:flex-end;height:100%;position:relative;cursor:pointer" data-tip="' + tooltip + '"><div style="width:100%;height:' + h + 'px;min-height:4px;background:' + barColor + ';box-shadow:' + barGlow + '" onmouseenter="this.style.background=&#39;'+barHover+'&#39;;this.style.boxShadow=&#39;0 0 16px rgba(6,182,212,.6)&#39;;var tip=this.parentElement.getAttribute(&#39;data-tip&#39;);if(tip){var el=document.createElement(&#39;span&#39;);el.className=&#39;chart-tooltip&#39;;el.textContent=tip;this.parentElement.appendChild(el);setTimeout(function(){el.classList.add(&#39;show&#39;)},10)}" onmouseleave="this.style.background=&#39;'+barColor+'&#39;;this.style.boxShadow=&#39;'+barGlow+'&#39;;var tip=this.parentElement.querySelector(&#39;.chart-tooltip&#39;);if(tip)tip.remove()"></div></div>';
          });
          container.innerHTML = barHtml;
          // Update date labels
          var labelsEl = document.getElementById('dailyChartLabels');
          if (labelsEl) {
            var now = new Date();
            var d14 = new Date(now.getTime() - 13 * 86400000);
            var d7 = new Date(now.getTime() - 6 * 86400000);
            var fmt = function(d){ return ('0'+d.getDate()).slice(-2) + '/' + ('0'+(d.getMonth()+1)).slice(-2); };
            var spans = labelsEl.querySelectorAll('span');
            if (spans[0]) spans[0].textContent = fmt(d14);
            if (spans[1]) spans[1].textContent = fmt(d7);
            if (spans[2]) spans[2].textContent = (window.I18n && I18n.getLang()==='en') ? 'Today' : 'Oggi';
          }
        } catch(e) { container.innerHTML = '<span style="font-size:13px;color:var(--text-faint);align-self:center;width:100%;text-align:center">Errore nel caricamento</span>'; }
      }

      // ═══ RENDER: Practice time chart (site engagement, not session) ═══
      function renderPracticeChart() {
        var container = document.getElementById('practiceChart');
        var labelsEl = document.getElementById('practiceChartLabels');
        var totalEl = document.getElementById('practiceChartTotal');
        if (!container || !labelsEl) return;
        try {
          var now = new Date();
          var dayNames = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
          var days = [];
          for (var d = 13; d >= 0; d--) {
            var date = new Date(now.getTime() - d * 86400000);
            var dayName = dayNames[date.getDay()];
            var dayNum = date.getDate();
            days.push({ date: date, label: dayName + ' ' + dayNum, iso: date.toISOString().substring(0, 10), minutes: 0 });
          }
          // Read practice time from localStorage
          var stored = localStorage.getItem('sottotitoli-practice-minutes');
          var allData = stored ? JSON.parse(stored) : {};
          days.forEach(function(day) {
            day.minutes = Math.round((allData[day.iso] || 0) / 60);
          });
          var maxMin = Math.max.apply(null, days.map(function(d) { return d.minutes; })) || 1;
          var totalMin = days.reduce(function(s, d) { return s + d.minutes; }, 0);
          if (totalEl) totalEl.textContent = totalMin + ' min totali';
          var chartH = 90;
          var barHtml = '';
          var labelHtml = '';
          days.forEach(function(day) {
            var h = Math.max(2, Math.round((day.minutes / maxMin) * chartH));
            var color = day.minutes > 0 ? 'var(--teal)' : 'var(--line)';
            var tooltip = day.iso + ' — ' + day.minutes + ' min';
            barHtml += '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:3px;cursor:pointer;height:100%;position:relative" data-tip="' + tooltip + '"><span style="font-size:11px;color:var(--text-faint);flex-shrink:0">' + (day.minutes || '') + '</span><div style="width:100%;height:' + h + 'px;min-height:2px;background:' + color + ';border-radius:3px 3px 0 0;transition:height .4s ease;flex-shrink:0" onmouseenter="this.style.boxShadow=&#39;0 0 10px rgba(5,150,105,.6)&#39;;var tip=this.parentElement.getAttribute(&#39;data-tip&#39;);if(tip){var el=document.createElement(&#39;span&#39;);el.className=&#39;chart-tooltip&#39;;el.textContent=tip;this.parentElement.appendChild(el);setTimeout(function(){el.classList.add(&#39;show&#39;)},10)}" onmouseleave="this.style.boxShadow=&#39;none&#39;;var tip=this.parentElement.querySelector(&#39;.chart-tooltip&#39;);if(tip)tip.remove()"></div></div>';
            labelHtml += '<span style="flex:1;text-align:center;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + day.label + '</span>';
          });
          container.innerHTML = barHtml || '<span style="font-size:13px;color:var(--text-faint);align-self:center;width:100%;text-align:center">Nessun dato</span>';
          labelsEl.innerHTML = labelHtml;
        } catch(e) { container.innerHTML = '<span style="font-size:13px;color:var(--text-faint);align-self:center;width:100%;text-align:center">Errore</span>'; }
      }

      // ═══ Practice time tracker: counts seconds on page when visible ═══
      (function() {
        var trackKey = 'sottotitoli-practice-minutes';
        var tickInterval = null;
        var lastTick = Date.now();
        function startTracking() {
          if (tickInterval) return;
          lastTick = Date.now();
          tickInterval = setInterval(function() {
            var now = Date.now();
            var elapsed = Math.round((now - lastTick) / 1000);
            lastTick = now;
            if (elapsed <= 0 || elapsed > 10) return; // ignore huge gaps (tab was hidden)
            var today = new Date().toISOString().substring(0, 10);
            var stored = localStorage.getItem(trackKey);
            var data = stored ? JSON.parse(stored) : {};
            data[today] = (data[today] || 0) + elapsed;
            // Keep only last 30 days
            var keys = Object.keys(data).sort();
            while (keys.length > 30) { delete data[keys.shift()]; }
            localStorage.setItem(trackKey, JSON.stringify(data));
          }, 1000);
        }
        function stopTracking() {
          if (tickInterval) { clearInterval(tickInterval); tickInterval = null; }
        }
        document.addEventListener('visibilitychange', function() {
          if (document.hidden) stopTracking();
          else startTracking();
        });
        if (!document.hidden) startTracking();
      })();

      // ═══ RENDER: Insights metrics ───
      function renderInsightsMetrics() {
        var s = currentStats();
        // ── Stats row ──
        var sRow = document.querySelector('#pnl-grammar-hub .stats-row');
        if (sRow && s) {
          var cards = sRow.querySelectorAll('.metric-card');
          if (cards.length >= 3) {
            var dailyMin = s.thisWeekSessions > 0 ? Math.round(s.thisWeekMinutes / Math.min(7, s.thisWeekSessions)) : 0;
            if (cards[0]) {
              cards[0].querySelector('.metric-value').innerHTML = '<span contenteditable=\"true\" style=\"outline:none;border-bottom:2px dashed var(--teal);cursor:text\" onblur=\"saveDailyTarget(this.textContent)\">'+dailyMin+'</span><span style=\"font-size:18px\">/30</span>';
              cards[0].querySelector('.metric-label').innerHTML = 'Minuti giornalieri <span style=\"font-size:11px;color:var(--text-faint)\">(clicca per modificare)</span>';
            }
            var completionPct = Math.min(100, Math.round((s.thisWeekSessions || 0) / 7 * 100));
            if (cards[1]) cards[1].querySelector('.metric-value').textContent = completionPct + '%';
            if (cards[2]) cards[2].querySelector('.metric-value').textContent = '—';
          }
        }
        // ── Estimated CEFR level — weighted average (higher levels pull you up) ──
        var estimatedLevel = '—';
        var levelSubtext = 'Nessuna sessione registrata. Inizia a parlare!';
        var levelBarPct = 0;
        var levelRingOffset = 264; // full dasharray (hidden)
        if (cefrBreakdown && cefrBreakdown.total > 0) {
          // Weighted score: A1=1, A2=2, B1=3, B2=4, C1=5, C2=6
          var wSum = cefrBreakdown.A1*1 + cefrBreakdown.A2*2 + cefrBreakdown.B1*3 + cefrBreakdown.B2*4 + cefrBreakdown.C1*5 + cefrBreakdown.C2*6;
          var wAvg = wSum / cefrBreakdown.total;
          var lvlIdx = Math.round(wAvg) - 1;
          lvlIdx = Math.max(0, Math.min(5, lvlIdx));
          var lvlMap = ['A1','A2','B1','B2','C1','C2'];
          estimatedLevel = lvlMap[lvlIdx];
          levelBarPct = lvlIdx / 5 * 100;
          // Ring: offset proportional to weighted average (264 = empty, 0 = full C2)
          levelRingOffset = 264 - (wAvg / 6 * 264);
          // Build richer subtext
          var pctAboveA2 = Math.round((cefrBreakdown.B1 + cefrBreakdown.B2 + cefrBreakdown.C1 + cefrBreakdown.C2) / cefrBreakdown.total * 100);
          levelSubtext = 'Basato su <strong>' + cefrBreakdown.vocabSize + ' parole</strong>. Livello pesato: ' + estimatedLevel + ' · ' + pctAboveA2 + '% sopra A2.';
          // Store per-level data for POS detail
          window._vocabLevelData = {
            A1: cefrBreakdown.A1, A2: cefrBreakdown.A2, B1: cefrBreakdown.B1,
            B2: cefrBreakdown.B2, C1: cefrBreakdown.C1, C2: cefrBreakdown.C2,
            total: cefrBreakdown.total, vocabSize: cefrBreakdown.vocabSize
          };
        } else if (s && s.totalSessions > 0) {
          levelSubtext = 'Basato su <strong>' + s.totalSessions + ' sessioni</strong> registrate. Attiva l\'analisi per una stima del livello.';
        }
        // Update level display
        var levelEl = document.getElementById('dashboardLevelValue');
        if (levelEl) levelEl.textContent = estimatedLevel;
        // Update level ring
        var levelRing = document.getElementById('dashboardLevelRing');
        if (levelRing) levelRing.style.strokeDashoffset = levelRingOffset;
        // Update level bar fill
        var levelFill = document.getElementById('dashboardLevelBarFill');
        if (levelFill) levelFill.style.width = levelBarPct + '%';
        // Highlight correct level label
        var labelsEl = document.getElementById('dashboardLevelLabels');
        if (labelsEl) {
          var spans = labelsEl.querySelectorAll('span');
          spans.forEach(function(sp) {
            sp.style.color = ''; sp.style.fontWeight = '';
            if (sp.textContent === estimatedLevel) { sp.style.color = 'var(--teal)'; sp.style.fontWeight = '700'; }
          });
        }
        // Update level subtext
        var levelSub = document.getElementById('dashboardLevelSub');
        if (levelSub) levelSub.innerHTML = levelSubtext;
        // ── Habits — compute from session data ──
        if (s && s.totalSessions > 0) {
          var habChips = document.querySelectorAll('#pnl-grammar-hub .habit-chip');
          if (habChips.length >= 4) {
            var hvEls = document.querySelectorAll('#pnl-grammar-hub .habit-chip .hv');
            var hlEls = document.querySelectorAll('#pnl-grammar-hub .habit-chip .hl');
            // Show session count & daily average instead of fake time/day data
            if (hvEls[0]) hvEls[0].textContent = s.totalSessions;
            if (hlEls[0]) hlEls[0].textContent = 'Sessioni totali';
            if (hvEls[1]) hvEls[1].textContent = s.avgWpm > 0 ? s.avgWpm : '—';
            if (hlEls[1]) hlEls[1].textContent = 'WPM medio';
            if (hvEls[2]) hvEls[2].textContent = s.avgLexDiv > 0 ? s.avgLexDiv.toFixed(2) : '—';
            if (hlEls[2]) hlEls[2].textContent = 'Diversità less.';
            if (hvEls[3]) hvEls[3].textContent = fmtMinutes(s.totalMinutes);
            if (hlEls[3]) hlEls[3].textContent = 'Tempo parlato';
          }
        }
      }

      // ═══ Vocab Level: POS breakdown on bar click ───
      window.toggleVocabLevelDetail = function(e) {
        e.stopPropagation();
        var detail = document.getElementById('vocabLevelPosDetail');
        if (!detail) return;
        var isOpen = detail.style.display !== 'none';
        if (isOpen) { detail.style.display = 'none'; return; }
        detail.style.display = 'block';
        // Build per-POS bars from stored level data
        var data = window._vocabLevelData;
        if (!data || !data.total) { detail.innerHTML = '<p style="font-size:13px;color:var(--text-faint)">Nessun dato disponibile. Completa alcune sessioni.</p>'; return; }
        var lvlOrder = ['A1','A2','B1','B2','C1','C2'];
        var lvlColors = {A1:'var(--green)',A2:'var(--teal)',B1:'var(--teal-2)',B2:'var(--teal)',C1:'var(--amber)',C2:'#8b5cf6'};
        // Simulate per-POS distributions based on real CEFR data
        // Nouns skew lower, verbs mid, adjectives higher
        var posNames = [
          {key:'nouns',label:'Nomi',skew:[0.45,0.28,0.15,0.08,0.03,0.01]},
          {key:'verbs',label:'Verbi',skew:[0.35,0.30,0.18,0.10,0.05,0.02]},
          {key:'adjectives',label:'Aggettivi',skew:[0.20,0.25,0.25,0.15,0.10,0.05]}
        ];
        var barsContainer = document.getElementById('vocabLevelPosBars');
        if (!barsContainer) return;
        var totalWords = data.total;
        var html = '';
        posNames.forEach(function(pos) {
          html += '<div style="margin-bottom:2px"><div style="display:flex;justify-content:space-between;font-size:11px;font-weight:600;color:var(--text-soft);margin-bottom:4px"><span>' + pos.label + '</span><span style="font-weight:400;color:var(--text-faint)">' + totalWords + ' parole</span></div>';
          html += '<div style="display:flex;height:18px;border-radius:9px;overflow:hidden;gap:2px">';
          lvlOrder.forEach(function(lvl, idx) {
            var pct = Math.round(pos.skew[idx] * 100);
            if (pct > 0) {
              html += '<div style="width:' + pct + '%;background:' + lvlColors[lvl] + ';display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.3)" title="' + lvl + ': ~' + Math.round(pos.skew[idx] * data[lvl]) + ' parole">' + (pct >= 5 ? lvl : '') + '</div>';
            }
          });
          html += '</div></div>';
        });
        barsContainer.innerHTML = html;
      };

      // ═══ RENDER: Trascrizioni session list ───
      // ═══ RENDER: Trascrizioni ───
      async function renderSessions() {
        var lang = window.SOTTOTITOLI_STUDY_LANG || 'en';
        var sessions = await SottotitoliData.getSessions(lang, 50);
        var list = document.getElementById('sessionsList');
        if (!list) return;

        if (!sessions || !sessions.length) {
          list.innerHTML = '<div class="term-row"><span style="flex:2;color:var(--text-faint);padding-left:40px">Nessuna sessione registrata</span></div>';
          renderFavorites([]);
          return;
        }

        // Build rows with checkboxes and proper alignment
        var html = '';
        sessions.forEach(function(s){
          var name = s.name || 'Sessione ' + (s.id ? s.id.substring(0,8) : '—');
          var dateStr = s.started_at ? fmtDate(s.started_at) : '—';
          var words = s.words_count || 0;
          var quality = s.quality_score ? Math.round(s.quality_score * 100) + '%' : '—';
          var qColor = s.quality_score >= 0.8 ? 'var(--green)' : s.quality_score >= 0.6 ? 'var(--teal)' : 'var(--cyan)';
          var favClass = s.favorite ? ' active' : '';
          html += '<div class="term-row" data-sid="' + (s.id||'') + '">' +
            '<span style="width:32px;flex-shrink:0;display:flex;align-items:center"><input type="checkbox" class="session-checkbox" data-sid="' + (s.id||'') + '" onchange="updateDeleteBtn()" style="accent-color:var(--teal);width:15px;height:15px;cursor:pointer"></span>' +
            '<span style="flex:2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:text" title="Clicca per rinominare" onclick="event.stopPropagation();renameSession(this,\'' + (s.id||'') + '\')">' + name + '</span>' +
            '<span style="flex:0.7;text-align:right;font-weight:600;font-size:13px">' + words + '</span>' +
            '<span style="flex:1;text-align:right;font-size:13px;color:var(--text-faint)">' + dateStr + '</span>' +
            '<span style="flex:0.7;text-align:right;font-weight:600;color:' + qColor + ';font-size:13px">' + quality + '</span>' +
            '<span style="width:80px;flex-shrink:0;display:flex;align-items:center;justify-content:flex-end;gap:2px">' +
              '<button class="tr-action tr-fav' + favClass + '" onclick="event.stopPropagation();toggleFavorite(this,\'' + (s.id||'') + '\')" title="Preferito" style="border:none;background:none;cursor:pointer">&#9733;</button>' +
              '<button class="tr-action" onclick="event.stopPropagation();deleteSession(\'' + (s.id||'') + '\',this)" title="Elimina" style="border:none;background:none;cursor:pointer;color:var(--text-faint)"><svg style="width:14px;height:14px"><use href="#i-trash"></use></svg></button>' +
            '</span>' +
            '</div>';
        });
        list.innerHTML = html;

        // Render favorites
        renderFavorites(sessions.filter(function(s){ return s.favorite; }));

        // Reset select-all
        var sa = document.getElementById('selectAllSessions');
        if (sa) sa.checked = false;
        updateDeleteBtn();
      }

      // ── Favorites list ──
      function renderFavorites(favs) {
        var fl = document.getElementById('favoritesList');
        if (!fl) return;
        if (!favs || !favs.length) {
          fl.innerHTML = '<span style="color:var(--text-faint);font-size:13px">Nessun preferito. Clicca la <strong style="color:#e8b84b">&starf;</strong> su una sessione per aggiungerla qui.</span>';
          return;
        }
        var h = '';
        favs.slice(0,5).forEach(function(s){
          var name = s.name || 'Sessione ' + (s.id ? s.id.substring(0,8) : '—');
          var dateStr = s.started_at ? new Date(s.started_at).toLocaleDateString('it-IT',{day:'numeric',month:'short'}) : '';
          var quality = s.quality_score ? Math.round(s.quality_score * 100) + '%' : '—';
          h += '<div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;padding:6px 0;border-bottom:1px solid var(--line)">' +
            '<span><strong style="cursor:pointer" onclick="document.querySelector(\'[data-sid=&quot;'+s.id+'&quot;]\').scrollIntoView({behavior:\'smooth\'})">' + name + '</strong> <span style="font-size:11px;color:var(--text-faint)">' + dateStr + '</span></span>' +
            '<span style="color:var(--teal);font-weight:600">' + quality + '</span>' +
            '</div>';
        });
        fl.innerHTML = h;
      }

      // ── Select all / deselect all ──
      function toggleSelectAllSessions() {
        var sa = document.getElementById('selectAllSessions');
        var cbs = document.querySelectorAll('#sessionsList .session-checkbox');
        cbs.forEach(function(cb){ cb.checked = sa.checked; });
        updateDeleteBtn();
      }

      // ── Update delete button state ──
      function updateDeleteBtn() {
        var btn = document.getElementById('deleteSelectedBtn');
        var cbs = document.querySelectorAll('#sessionsList .session-checkbox:checked');
        if (!btn) return;
        if (cbs.length > 0) {
          btn.disabled = false;
          btn.style.opacity = '1';
          btn.style.pointerEvents = 'auto';
          btn.style.cursor = 'pointer';
        } else {
          btn.disabled = true;
          btn.style.opacity = '0.4';
          btn.style.pointerEvents = 'none';
        }
      }

      // ── Rename session (inline edit) ──
      async function renameSession(span, sid) {
        var oldName = span.textContent.trim();
        var input = document.createElement('input');
        input.value = oldName;
        input.style.cssText = 'width:100%;border:none;outline:none;background:transparent;font:inherit;color:var(--text);padding:0;margin:0';
        span.textContent = '';
        span.appendChild(input);
        input.focus();
        input.select();
        var save = async function(){
          var newName = input.value.trim() || oldName;
          span.textContent = newName;
          try {
            var sb = window.sottotitoliSupabase;
            if (sb) await sb.from('sessions').update({ name: newName }).eq('id', sid);
          } catch(e) {}
          // Reflect the new name on the dashboard "Ultime sessioni" feed right away
          if (window.syncSessionName) window.syncSessionName(sid, newName);
        };
        input.addEventListener('blur', save);
        input.addEventListener('keydown', function(e){ if (e.key === 'Enter') { input.blur(); } });
      }

      // ── Delete single session ──
      async function deleteSession(sid, el) {
        appConfirm('Eliminare questa sessione? Questa azione non può essere annullata.', async function(){
          try {
            var sb = window.sottotitoliSupabase;
            if (!sb) { appAlert('Non autenticato', 'Accesso richiesto', '🔒'); return; }
            var r = await sb.from('sessions').delete().eq('id', sid);
            if (r.error) { appAlert('Errore: ' + r.error.message, 'Errore', '❌'); return; }
            // Remove row from DOM
            var row = el.closest('.term-row');
            if (row) row.style.display = 'none';
            // Refresh favorites
            var lang = window.SOTTOTITOLI_STUDY_LANG || 'en';
            var sessions = await SottotitoliData.getSessions(lang, 50);
            renderFavorites(sessions.filter(function(s){ return s.favorite; }));
          } catch(e) { appAlert('Errore: ' + e.message, 'Errore', '❌'); }
        }, 'Elimina sessione', '🗑️');
      }

      // ── Delete selected sessions ──
      async function deleteSelectedSessions() {
        var cbs = document.querySelectorAll('#sessionsList .session-checkbox:checked');
        if (!cbs.length) return;
        appConfirm('Eliminare ' + cbs.length + ' sessione/i selezionata/e?', async function(){
          try {
            var sb = window.sottotitoliSupabase;
            if (!sb) { appAlert('Non autenticato', 'Accesso richiesto', '🔒'); return; }
            var ids = [];
            cbs.forEach(function(cb){ ids.push(cb.getAttribute('data-sid')); });
            var r = await sb.from('sessions').delete().in('id', ids);
            if (r.error) { appAlert('Errore: ' + r.error.message, 'Errore', '❌'); return; }
            // Refresh list
            renderSessions();
          } catch(e) { appAlert('Errore: ' + e.message, 'Errore', '❌'); }
        }, 'Elimina sessioni', '🗑️');
      }

      // ── Toggle favorite ──
      async function toggleFavorite(el, sid) {
        var isNowActive = !el.classList.contains('active');
        el.classList.toggle('active');
        // Persist to Supabase
        try {
          var sb = window.sottotitoliSupabase;
          if (sb) {
            await sb.from('sessions').update({ favorite: isNowActive }).eq('id', sid);
          }
        } catch(e) {}
        // Refresh favorites list
        var lang = window.SOTTOTITOLI_STUDY_LANG || 'en';
        var sessions = await SottotitoliData.getSessions(lang, 50);
        renderFavorites(sessions.filter(function(s){ return s.favorite; }));
      }

      // Expose to global scope
      window.toggleSelectAllSessions = toggleSelectAllSessions;
      window.deleteSelectedSessions = deleteSelectedSessions;
      window.deleteSession = deleteSession;
      window.toggleFavorite = toggleFavorite;
      window.updateDeleteBtn = updateDeleteBtn;

      // ═══ RENDER: Profilo ───
      function renderProfile() {
        if (!profile) return;
        var p = profile;
        var displayName = p.display_name || '';
        
        // Update hero + dropdown with display name
        if (displayName) {
          var heroEm = document.querySelector('.hero-content h2 em');
          if (heroEm) heroEm.textContent = displayName;
        }

        // Display name input
        var dni = document.getElementById('displayNameInput');
        if (dni && !dni.value) {
          dni.value = displayName;
        }

        // ── Plan pill ──
        var planPill = document.getElementById('profilePlanPill');
        if (planPill && p.plan) {
          var planColors = { premium:'#a855f7', standard:'var(--cyan)', free:'var(--text-soft)', pro:'#a855f7' };
          var planNames = { premium:'PREMIUM', standard:'STANDARD', free:'FREE', pro:'PRO' };
          var plan = (p.plan||'').toLowerCase();
          planPill.textContent = planNames[plan] || plan.toUpperCase();
          planPill.style.display = '';
          planPill.style.background = (planColors[plan]||'var(--text-soft)') + '22';
          planPill.style.color = planColors[plan] || 'var(--text-soft)';
          planPill.style.border = '1px solid ' + (planColors[plan]||'var(--text-soft)');
        }
        // Load Profilo Linguistico selections from saved profile
        renderProfiloLinguistico();

        // ── Referral card — always fetch fresh data ──
        if (meta && meta.id) {
          window._refLink = 'www.sottotitoli.pro/?ref=' + meta.id;
          var refLinkEl = document.getElementById('profileRefLink');
          var refCodeEl = document.getElementById('profileRefCode');
          if (refLinkEl) refLinkEl.textContent = window._refLink;
          if (refCodeEl) refCodeEl.textContent = meta.id.substring(0, 8).toUpperCase();
        }
        // Fetch real-time referral stats
        if (typeof SottotitoliData !== 'undefined' && SottotitoliData.getReferralStats) {
          SottotitoliData.getReferralStats().then(function(refs) {
            window.refs = refs;
            var earnedEl = document.getElementById('profileRefEarned');
            if (earnedEl && refs) earnedEl.textContent = '+' + (refs.earnedMinutes || 0);
          }).catch(function(){});
        }
      }

      // ── Copy profile referral link ──
      window.copyProfileRef = function() {
        var text = currentRefLink();
        if (navigator.clipboard) {
          navigator.clipboard.writeText(text).then(function() {
            var btn = document.getElementById('profileCopyRefBtn');
            if (btn) { btn.textContent = '✓'; setTimeout(function(){ btn.textContent = 'Copia'; }, 2000); }
          });
        }
      };

      // ── Share referral via WhatsApp ──
      window.shareRefWhatsApp = function() {
        var link = currentRefLink();
        var msg = encodeURIComponent('Unisciti a Sottotitoli — captioning e traduzione in tempo reale gratis! ' + link);
        window.open('https://wa.me/?text=' + msg, '_blank');
      };

      // ── Share referral via Email ──
      window.shareRefEmail = function() {
        var link = currentRefLink();
        var subject = encodeURIComponent('Prova Sottotitoli con me!');
        var body = encodeURIComponent('Ciao!\n\nTi invito a provare Sottotitoli, uno strumento per captioning e traduzione in tempo reale. È gratis!\n\n' + link + '\n\nCi vediamo lì!');
        window.open('mailto:?subject=' + subject + '&body=' + body, '_blank');
      };

      // ── QR referral popup ──
      function currentRefLink() {
        var el = document.getElementById('profileRefLink');
        var v = el ? el.textContent.trim() : '';
        if (v && v !== 'Caricamento…' && v !== 'Loading…') return v;
        return window._refLink || 'www.sottotitoli.pro';
      }
      window.openRefQR = function() {
        var link = currentRefLink();
        var full = 'https://' + link.replace(/^https?:\/\//, '');
        var img = document.getElementById('refQRImg');
        if (img) img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=' + encodeURIComponent(full);
        var inp = document.getElementById('refQRLink');
        if (inp) inp.value = full;
        var m = document.getElementById('refQRModal');
        if (m) { m.style.display = 'flex'; }
      };
      window.closeRefQR = function() {
        var m = document.getElementById('refQRModal');
        if (m) m.style.display = 'none';
      };
      window.copyRefQR = function() {
        var inp = document.getElementById('refQRLink');
        if (inp && navigator.clipboard) navigator.clipboard.writeText(inp.value).then(function(){
          var b = document.getElementById('refQRCopy');
          if (b) { b.textContent = '✓'; setTimeout(function(){ b.textContent = 'Copia'; }, 1800); }
        });
      };

      // ═══ Load/save Profilo Linguistico from Supabase profiles ═══
      function renderProfiloLinguistico() {
        if (!profile) return;
        var p = profile;

        // ── Native language ──
        if (p.native_proficiency) selectChipByVal('#nativeProficiency .q-chip', p.native_proficiency);
        if (p.native_contexts && Array.isArray(p.native_contexts)) {
          p.native_contexts.forEach(function(v){ selectChipByVal('#nativeContexts .q-chip', v); });
        }
        if (p.native_improve && Array.isArray(p.native_improve)) {
          p.native_improve.forEach(function(v){ selectChipByVal('#nativeImprove .q-chip', v); });
        }
        var ngInput = document.getElementById('nativeGoalsInput');
        if (ngInput && p.native_goals) ngInput.value = p.native_goals;

        // ── Target language ──
        if (p.goal_primary) selectChipByVal('#targetPurpose .q-chip', p.goal_primary);
        if (p.use_cases && Array.isArray(p.use_cases)) {
          p.use_cases.forEach(function(v){ selectChipByVal('#targetSituations .q-chip', v); });
        }
        if (p.domain) selectChipByVal('#targetSector .q-chip', p.domain);
        // Level: stored in learning_profile or we use a dedicated column — check feedback_preference as fallback
        if (p.feedback_preference) selectChipByVal('#targetLevel .q-chip', p.feedback_preference);
        var tgInput = document.getElementById('targetGoalInput');
        if (tgInput && p.context_examples_preference) tgInput.value = p.context_examples_preference;
      }

      function selectChipByVal(selector, val) {
        document.querySelectorAll(selector).forEach(function(chip){
          if (chip.getAttribute('data-val') === val) {
            chip.classList.add('active');
            chip.setAttribute('aria-pressed','true');
          }
        });
      }

      window.saveProfiloLinguistico = async function() {
        var uid = await SottotitoliData.getUserId();
        if (!uid || !window.sottotitoliSupabase) return;

        // ── Read native language selections ──
        var profChip = document.querySelector('#nativeProficiency .q-chip.active');
        var nativeProficiency = profChip ? profChip.getAttribute('data-val') : null;
        var ctxChips = document.querySelectorAll('#nativeContexts .q-chip.active');
        var nativeContexts = Array.from(ctxChips).map(function(c){ return c.getAttribute('data-val'); });
        var impChips = document.querySelectorAll('#nativeImprove .q-chip.active');
        var nativeImprove = Array.from(impChips).map(function(c){ return c.getAttribute('data-val'); });
        var ngInput = document.getElementById('nativeGoalsInput');
        var nativeGoals = ngInput ? ngInput.value.trim() : '';

        // ── Read target language selections ──
        var purChip = document.querySelector('#targetPurpose .q-chip.active');
        var goalPrimary = purChip ? purChip.getAttribute('data-val') : null;
        var sitChips = document.querySelectorAll('#targetSituations .q-chip.active');
        var useCases = Array.from(sitChips).map(function(c){ return c.getAttribute('data-val'); });
        var secChip = document.querySelector('#targetSector .q-chip.active');
        var domain = secChip ? secChip.getAttribute('data-val') : null;
        var lvlChip = document.querySelector('#targetLevel .q-chip.active');
        var level = lvlChip ? lvlChip.getAttribute('data-val') : null;
        var tgInput = document.getElementById('targetGoalInput');
        var shortTermGoal = tgInput ? tgInput.value.trim() : '';

        // ── Save to profiles ──
        var { error } = await window.sottotitoliSupabase.from('profiles').upsert({
          id: uid,
          native_proficiency: nativeProficiency,
          native_contexts: nativeContexts,
          native_improve: nativeImprove,
          native_goals: nativeGoals || null,
          goal_primary: goalPrimary,
          use_cases: useCases,
          domain: domain,
          feedback_preference: level,
          context_examples_preference: shortTermGoal || null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

        if (!error) {
          var msg = document.getElementById('savedProfileLingMsg');
          if (msg) { msg.style.display = 'inline'; setTimeout(function(){ msg.style.display = 'none'; }, 2000); }
          SottotitoliData.cacheClear();
        }
      };

      // ═══ RENDER: Impostazioni ───
      // simple sync render — settingsData must be loaded before calling
      function renderSettings(settingsData) {
        var s = settingsData || {};

        // Email
        var emailEl = document.getElementById('settingsEmail');
        if (emailEl && meta && meta.email) {
          emailEl.textContent = meta.email.replace(/(.{2}).*(@.*)/, '$1****$2');
        }

        // Plan
        var planEl = document.getElementById('settingsPlan');
        if (planEl && credits) {
          planEl.textContent = credits.balanceMinutes > 15 ? 'Standard' : 'Gratuito';
          planEl.setAttribute('data-i18n', credits.balanceMinutes > 15 ? 'standard_plan' : 'free_plan');
          planEl.style.color = credits.balanceMinutes > 15 ? 'var(--teal)' : 'var(--cyan)';
        }

        // UI Language
        var uiLang = document.getElementById('settingsUiLang');
        if (uiLang) {
          var currentUi = (typeof I18n !== 'undefined' && I18n.getLang) ? I18n.getLang() : 'it';
          uiLang.value = s.ui_language || currentUi;
        }

        // Aspetto — Theme (only set dropdown value; don't re-apply on every render)
        var themeEl = document.getElementById('settingsTheme');
        if (themeEl) {
          var currentTheme = s.theme || localStorage.getItem('sottotitoli-theme') || 'modern';
          // Map legacy base-theme values (auto/light/dark) to the new 4-option set
          if (currentTheme === 'auto' || currentTheme === 'light' || currentTheme === 'dark') currentTheme = 'modern';
          // If a wrapped theme is active locally, reflect it in the dropdown
          var lsT = null; try { lsT = localStorage.getItem('sottotitoli-theme'); } catch(e){}
          if (lsT === 'modern' || lsT === 'modern-light' || lsT === 'genz' || lsT === 'genz-dark') currentTheme = lsT;
          themeEl.value = currentTheme;
        }

        // Default caption language — try settingsData first, then localStorage directly
        var dcl = document.getElementById('settingsDefaultCapLang');
        if (dcl) {
          var capVal = s.default_caption_lang || '';
          if (!capVal) {
            try { var ls = JSON.parse(localStorage.getItem('sottotitoli-settings') || 'null'); if (ls && ls.default_caption_lang) capVal = ls.default_caption_lang; } catch(e) {}
          }
          dcl.value = capVal;
        }

        // Default translation pair — try settingsData first, then localStorage directly
        var dtp = document.getElementById('settingsDefaultTrPair');
        if (dtp) {
          var trVal = s.default_translation_pair || '';
          if (!trVal) {
            try { var ls2 = JSON.parse(localStorage.getItem('sottotitoli-settings') || 'null'); if (ls2 && ls2.default_translation_pair) trVal = ls2.default_translation_pair; } catch(e) {}
          }
          dtp.value = trVal;
        }
      }

      // ── Apply theme immediately (called from settings + on page load) ──
      function applyTheme(t) {
        if (t === 'auto') {
          // Auto: use system preference
          t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        document.documentElement.setAttribute('data-theme', t);
        document.body.setAttribute('data-theme', t);
        localStorage.setItem('sottotitoli-theme', t);
      }
      // Expose so the Wrapped switcher + settings cards (separate script blocks) can call it
      window.applyTheme = applyTheme;

      // ═══ RENDER: Report AI ───
      function renderAIReports() {
        // Store reports globally so the subtab's table script can access them
        window.reports = reports || [];
        // If the "I miei Report" subtab is active, trigger a refresh
        var mieiPane = document.getElementById('sub-rai-miei');
        if (mieiPane && mieiPane.classList.contains('active')) {
          // Dispatch a custom event that the subtab script listens for
          mieiPane.dispatchEvent(new CustomEvent('reports-loaded'));
        }
      }

      // ═══ RENDER: Word banks ───
      // ═══ RENDER: Wordbanks — three-layer vocabulary workspace ═══
      var _wbState = { currentBank: null, currentWords: [], selectedRows: new Set() };

      async function renderWordbanks() {
        var lang = window.SOTTOTITOLI_STUDY_LANG || 'en';
        // ── Stats (cyan metric card style) ──
        var stats = await SottotitoliData.getWordbankStats(lang);
        var statsEl = document.getElementById('wbStats');
        if (statsEl) {
          var cards = [
            { v: stats.totalWords, l: 'Totale parole', b: '' },
            { v: stats.dueToday, l: 'In scadenza oggi', b: stats.dueToday > 0 ? stats.dueToday + ' da ripassare' : 'Tutto in ordine' },
            { v: stats.newThisWeek, l: 'Nuove questa settimana', b: stats.newThisWeek > 0 ? '+' + stats.newThisWeek + ' questa settimana' : '' },
            { v: stats.known, l: 'Known', b: '' },
            { v: stats.learning, l: 'Learning', b: '' }
          ];
          statsEl.innerHTML = '<div class="stats-row" style="grid-template-columns:repeat(5,1fr);margin-bottom:0">' +
            cards.map(function(c){ return '<div class="metric-card" style="min-height:80px;padding:14px 16px"><div class="metric-label" style="margin-bottom:2px">'+c.l+'</div><div class="metric-value" style="font-size:28px">'+c.v+'</div>'+(c.b?'<div class="metric-badge">'+c.b+'</div>':'')+'</div>'; }).join('') +
            '</div>';
        }

        // ── Pinned counts: try review_words first, fall back to wordbank stats ──
        var pinnedCounts = { review_due_now: 0, saved_from_sessions: 0, fragile_words: 0, vocab_builder_en: 0 };
        try {
          var sbClient = window.sottotitoliSupabase;
          if (sbClient) {
            var nowISO = new Date().toISOString();
            // Review Due Now: next_review_at <= now OR is_new=true (never reviewed yet)
            var { count: dueCount } = await sbClient.from('review_words').select('*', { count: 'exact', head: true }).or('next_review_at.lte.' + nowISO + ',is_new.eq.true');
            if (dueCount !== null) pinnedCounts.review_due_now = dueCount;
            // Fragile Words: mastery < 40 OR lapses >= 2
            var { count: fragCount } = await sbClient.from('review_words').select('*', { count: 'exact', head: true }).or('mastery_score.lt.40,lapses.gte.2');
            if (fragCount !== null) pinnedCounts.fragile_words = fragCount;
          }
        } catch(e) { /* review_words table may not exist yet — fall back to wordbank stats */ }
        // Saved From Sessions: count from the actual user bank
        if (stats.totalWords > 0) pinnedCounts.saved_from_sessions = stats.totalWords;

        var pinnedBanks = [
          { id: 'review_due_now', name: 'Ripasso immediato', desc: 'Parole da ripassare ora o in ritardo', count: pinnedCounts.review_due_now, signal: pinnedCounts.review_due_now > 0 ? pinnedCounts.review_due_now + ' da fare' : 'Tutto in ordine!', subtitle: 'Parole pronte per il ripasso immediato' },
          { id: 'saved_from_sessions', name: 'Saved From Sessions', desc: 'Words you saved during live sessions', count: pinnedCounts.saved_from_sessions, signal: pinnedCounts.saved_from_sessions > 0 ? pinnedCounts.saved_from_sessions + ' words' : 'Save words during sessions', subtitle: 'Saved words from live use' },
          { id: 'vocab_builder_en', name: 'English Vocabulary Builder', desc: 'Words saved from Vocabulary Builder search', count: pinnedCounts.vocab_builder_en, signal: pinnedCounts.vocab_builder_en > 0 ? pinnedCounts.vocab_builder_en + ' words' : 'Save from VB', subtitle: 'Saved from Vocabulary Builder English' },
          { id: 'fragile_words', name: 'Fragile Words', desc: 'Weak words at risk of being forgotten', count: pinnedCounts.fragile_words, signal: pinnedCounts.fragile_words > 0 ? pinnedCounts.fragile_words + ' need reinforcement' : 'None at risk', subtitle: 'Words that need reinforcement' }
        ];
        var pinnedHtml = '';
        pinnedBanks.forEach(function(b) {
          pinnedHtml += wbCardHTML(b.id, b.name, 'pinned', b.desc, b.count, b.signal, [], b.subtitle);
        });
        // Pinned grid now rendered by renderWbOverviewSections() — skip old render
        // var pinnedGrid = document.getElementById('wbPinnedGrid');
        // if (pinnedGrid) pinnedGrid.innerHTML = pinnedHtml;

        // ── Smart banks — powered by SMART_SUGGESTIONS module ──
        var smartHtml = '';
        var smartCounts = { goal_next_step: 0, build_from_known: 0, activate_recognized: 0, upcoming_useful_vocab: 0, upcoming_session_driven: 0, upcoming_roadmap: 0 };
        try {
          if (window.SMART_SUGGESTIONS && window.SMART_SUGGESTIONS.getCounts) {
            smartCounts = await window.SMART_SUGGESTIONS.getCounts(lang);
          }
        } catch(e) { /* gracefully fall back to zeros */ }

        var betaBadge = ' <span style="display:inline-block;padding:1px 6px;border-radius:99px;background:var(--cyan);color:#000;font-size:11px;font-weight:700;letter-spacing:0.04em;margin-left:4px">BETA</span>';
        var infoIcon = function(how) {
          return ' <span title="' + how.replace(/"/g,'&quot;') + '" style="cursor:help;font-size:11px;color:var(--cyan);opacity:.85" onclick="event.stopPropagation();event.preventDefault();appAlert(\'' + how.replace(/'/g,"\\'").replace(/\n/g,' ') + '\', \'Info\', \'ℹ️\')"><i class="fa-solid fa-circle-info"></i></span>';
        };

        var smartBanks = [
          { id: 'goal_next_step', name: 'Next Step For Your Goal', desc: 'Goal-aligned vocabulary for your profile', count: smartCounts.goal_next_step, signal: smartCounts.goal_next_step > 0 ? smartCounts.goal_next_step + ' suggestions' : 'Set your goals', preview: [], subtitle: 'For your current goal' + betaBadge + infoIcon('How: Uses your profile (role + domain) to find topic-relevant words via Datamuse. Bridges from known words to goal-domain vocabulary.') },
          { id: 'build_from_known', name: 'Build From What You Know', desc: 'Higher-level replacements for words you know', count: smartCounts.build_from_known, signal: smartCounts.build_from_known > 0 ? smartCounts.build_from_known + ' suggestions' : 'From your vocabulary', preview: [], subtitle: 'Advance from known words' + betaBadge + infoIcon('How: Takes your top mastered words and finds higher-CEFR semantically related words via Datamuse. Only shows words above your current level. Boosted for your goal domain.') },
          { id: 'activate_recognized', name: 'Activate What You Recognize', desc: 'Passive vocabulary — words seen but not claimed', count: smartCounts.activate_recognized, signal: smartCounts.activate_recognized > 0 ? smartCounts.activate_recognized + ' passive words' : 'No passive gap', preview: [], subtitle: 'Claim your passive vocab' + betaBadge + infoIcon('How: Subtracts all words you have explicitly saved from all words you have ever encountered. The difference is your passive vocabulary. Saving a word here moves it to active.') },
          { id: 'upcoming_useful_vocab', name: 'Goal-Based Upcoming Vocab', desc: 'Words for your declared short-term goals', count: smartCounts.upcoming_useful_vocab, signal: smartCounts.upcoming_useful_vocab > 0 ? smartCounts.upcoming_useful_vocab + ' upcoming' : 'Declare a short-term goal', preview: [], subtitle: 'What you said you need next' + betaBadge + infoIcon('How: Reads your declared short-term goal (e.g. "Prepare for job interview") and uses Datamuse topics to find vocabulary. Filtered by your CEFR level. Set your short-term goal in Account > Goals.') },
          { id: 'upcoming_session_driven', name: 'Session-Detected Themes', desc: 'Predicted needs from your recent session topics', count: smartCounts.upcoming_session_driven, signal: smartCounts.upcoming_session_driven > 0 ? smartCounts.upcoming_session_driven + ' detected' : 'Not enough session data', preview: [], subtitle: 'From your practice patterns' + betaBadge + infoIcon('How: Analyzes your last 20 session titles for recurring themes. If you have been practicing "meetings" a lot, we predict you will need more meeting vocabulary next.') },
          { id: 'upcoming_roadmap', name: 'Your Learning Roadmap', desc: 'Staged vocabulary for your goal journey', count: smartCounts.upcoming_roadmap, signal: smartCounts.upcoming_roadmap > 0 ? smartCounts.upcoming_roadmap + ' staged' : 'Define goal stages', preview: [], subtitle: 'Stage-by-stage vocab plan' + betaBadge + infoIcon('How: Breaks your long-term goal into stages (e.g. interview → onboarding → daily work → meetings). Each stage has topic-specific vocabulary. Shows current and next stage words. Define stages in Account > Goals.') }
        ];
        smartBanks.forEach(function(b) {
          smartHtml += wbCardHTML(b.id, b.name, 'smart', b.desc, b.count, b.signal, b.preview, b.subtitle);
        });
        var smartGrid = document.getElementById('wbSmartGrid');
        if (smartGrid) smartGrid.innerHTML = smartHtml;

        // ── Custom banks from Supabase (exclude system banks already shown in Pinned/Smart) ──
        var banks = await SottotitoliData.getWordbanks(lang);
        var systemBankNames = ['Saved from sessions', 'Build From Known', 'New Words', 'Saved For Later', 'All Looked-Up Words'];
        var customHtml = '';
        if (banks && banks.length) {
          for (var i = 0; i < banks.length; i++) {
            var b = banks[i];
            if (systemBankNames.indexOf(b.name) !== -1) continue; // skip system-managed banks
            var words = await SottotitoliData.getWordbankWords(b.id);
            var preview = (words||[]).slice(0,3).map(function(w){return w.word;});
            customHtml += wbCardHTML(b.id, b.name, 'custom', b.description || '', (words||[]).length, (words||[]).length+' words', preview);
          }
        }
        // Add "new bank" card
        customHtml += '<div class="wb-card" style="border:2px dashed var(--line);background:transparent;display:flex;align-items:center;justify-content:center;min-height:130px;cursor:pointer" onclick="newWordbank()"><div style="text-align:center;color:var(--text-faint);font-size:15px;font-weight:600"><i class="fa-solid fa-plus" style="margin-right:6px;font-size:13px"></i> <span data-i18n="wb_new_bank">New Wordbank</span></div></div>';
        var customGrid = document.getElementById('wbCustomGrid');
        if (customGrid) customGrid.innerHTML = customHtml;

        // Attach click handlers — special case for Build From What You Know
        document.querySelectorAll('#wordbanksOverview .wb-card[data-bank-id]').forEach(function(card) {
          var bankId = card.getAttribute('data-bank-id');
          if (bankId === 'build_from_known') {
            card.addEventListener('click', function() {
              // Navigate to Vocabolario → Build From What You Know tab
              var vocNav = document.querySelector('[data-panel="vocabulary-builder"]');
              if (vocNav) vocNav.click();
              setTimeout(function() {
                var wbTab = document.querySelector('[data-subtab="wb-expand"]');
                if (wbTab) wbTab.click();
              }, 150);
            });
          } else {
            card.addEventListener('click', function() { openWordbankView(bankId); });
          }
        });
      }

      function wbCardHTML(id, name, type, desc, count, signal, preview, subtitle) {
        var cardTypeClass = type === 'pinned' ? 'pinned' : type === 'smart' ? 'smart' : 'custom';
        var actionClass = type === 'pinned' ? 'pinned-action' : type === 'smart' ? 'smart-action' : 'custom-action';
        var actionLabel = 'Open';
        var actionIcon = 'fa-solid fa-arrow-right';
        var subtitleHTML = subtitle ? '<div class="wb-card-subtitle">'+subtitle+'</div>' : '';
        // Three-dot menu
        var menuHTML = '<button class="wb-menu-trigger" onclick="event.stopPropagation();wbToggleMenu(this)" title="Opzioni"><i class="fa-solid fa-ellipsis"></i></button>' +
          '<div class="wb-menu-dropdown" style="display:none;position:absolute;right:8px;top:42px;min-width:150px">' +
            '<button class="wb-menu-item" onclick="event.stopPropagation();openWordbankView(\''+id+'\')"><i class="fa-solid fa-arrow-right" style="width:16px;margin-right:8px"></i>Open</button>' +
            (type === 'custom' ? '<button class="wb-menu-item" onclick="event.stopPropagation();wbRenameBank(\''+id+'\',\''+name.replace(/'/g,"\\'")+'\')"><i class="fa-solid fa-pen" style="width:16px;margin-right:8px"></i>Rename</button>' : '') +
            (type === 'custom' ? '<button class="wb-menu-item" onclick="event.stopPropagation();wbDuplicateBank(\''+id+'\')"><i class="fa-solid fa-copy" style="width:16px;margin-right:8px"></i>Duplicate</button>' : '') +
            (type === 'custom' ? '<button class="wb-menu-item danger" onclick="event.stopPropagation();wbDeleteBank(\''+id+'\',\''+name.replace(/'/g,"\\'")+'\')"><i class="fa-solid fa-trash" style="width:16px;margin-right:8px"></i>Delete</button>' : '') +
          '</div>';
        return '<article class="alt-card wb-card '+cardTypeClass+'" data-bank-id="'+id+'" style="cursor:pointer;padding:16px 18px;padding-right:40px;position:relative">'+
          menuHTML+
          '<div class="wb-card-head"><h4>'+name+'</h4></div>'+
          subtitleHTML+
          '<div class="wb-card-count">'+count+'</div>'+
          '<div class="wb-card-signal">'+signal+'</div>'+
          '<div class="wb-card-actions"><button class="btn-action '+actionClass+'" onclick="event.stopPropagation();openWordbankView(\''+id+'\')"><i class="'+actionIcon+'"></i> '+actionLabel+'</button></div>'+
          '</article>';
      }

      // ═══ RENDER: Wordbank Folders — ported from folders-ui (v0 "AI clips" project folders) ═══
      function wbEsc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
          return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c];
        });
      }
      function wbFldT(key) { return (window.I18n && I18n.t) ? I18n.t(key) : key; }

      // Curated small stock photos (600px wide, ~30-60KB) — deterministic per folder
      var WBF_STOCK = [
        'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=600&q=60&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=600&q=60&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=600&q=60&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&q=60&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&q=60&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=600&q=60&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1471970394675-613138e45da3?w=600&q=60&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=600&q=60&auto=format&fit=crop'
      ];
      function wbfStockUrl(id) {
        var s = String(id || ''), h = 0;
        for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
        return WBF_STOCK[h % WBF_STOCK.length];
      }

      // Race a data call against a timeout so the grid never hangs on a stalled request
      function wbTimeout(p, ms, fb) {
        var safe = Promise.resolve(p).catch(function(){ return fb; });
        var timer = new Promise(function(res){ setTimeout(function(){ res(fb); }, ms); });
        return Promise.race([safe, timer]);
      }

      function wbFolderCard(bk, L, lang) {
        var type = bk.type;
        var typeLabel = type === 'pinned' ? L.pinned : type === 'smart' ? L.smart : L.yours;
        var badgeCls = type === 'pinned' ? 'wbf-badge-pin' : type === 'smart' ? 'wbf-badge-smart' : 'wbf-badge-yours';
        // Favourite star: keyed by the folder view's language (EN → sottotitoli-fav-banks, IT → -it)
        var favKey = lang === 'it' ? 'sottotitoli-fav-banks-it' : 'sottotitoli-fav-banks';
        var favs = []; try { favs = JSON.parse(localStorage.getItem(favKey) || '[]'); } catch(e) {}
        var isFav = favs.indexOf(bk.id) >= 0;
        var preview = (bk.words || []).slice(0, 5);
        var cards = '';
        var positions = [-2, -1, 0, 1, 2];
        for (var i = 0; i < 5; i++) {
          var pos = positions[i];
          var w = preview[i];
          var x1 = pos * 54, r1 = pos * 9, s1 = 1 - Math.abs(pos) * 0.06, y1 = 6 + Math.abs(pos) * 4;
          var x0 = pos * 18, r0 = pos * 4, s0 = 0.52, y0 = 50 + Math.abs(pos) * 4;
          var inner;
          if (w && w.word) {
            inner = (w.cefr ? '<span class="wbf-cefr">'+wbEsc(w.cefr)+'</span>' : '') + '<div class="wbf-word">'+wbEsc(w.word)+'</div>';
          } else {
            inner = '<div class="wbf-word" style="opacity:.35;font-size:22px;padding:16px 8px">·</div>';
          }
          cards += '<div class="wbf-card" style="--x0:'+x0+'px;--y0:'+y0+'px;--r0:'+r0+'deg;--s0:'+s0+';--x1:'+x1+'px;--y1:'+y1+'px;--r1:'+r1+'deg;--s1:'+s1+';--b0:1.8px">'+inner+'</div>';
        }

        var menuItems = '<button data-act="open" data-bank="'+wbEsc(bk.id)+'"><i class="fa-solid fa-arrow-right"></i>'+L.open+'</button>'+
          '<button data-act="allena" data-bank="'+wbEsc(bk.id)+'"><i class="fa-solid fa-bolt"></i>'+L.allena+'</button>';
        if (type === 'custom') {
          menuItems +=
            '<button data-act="rename" data-bank="'+wbEsc(bk.id)+'" data-name="'+wbEsc(bk.title)+'"><i class="fa-solid fa-pen"></i>'+L.rename+'</button>'+
            '<button data-act="duplicate" data-bank="'+wbEsc(bk.id)+'"><i class="fa-solid fa-copy"></i>'+L.duplicate+'</button>'+
            '<button data-act="delete" data-bank="'+wbEsc(bk.id)+'" data-name="'+wbEsc(bk.title)+'" class="danger"><i class="fa-solid fa-trash"></i>'+L.delete+'</button>';
        }

        return '<article class="wbf-folder" data-bank-id="'+wbEsc(bk.id)+'" data-type="'+type+'">'+
          '<div class="wbf-folder-inner">'+
            '<div class="wbf-back" style="--wbf-img:url(\''+wbfStockUrl(bk.id)+'\')"><div class="wbf-cards">'+cards+'</div></div>'+
            '<div class="wbf-front">'+
              '<button type="button" class="wbf-fav'+(isFav?' on':'')+'" data-bank="'+wbEsc(bk.id)+'" data-lang="'+(lang||'en')+'" title="'+(isFav?L.fav_remove:L.fav_add)+'" onclick="event.stopPropagation();toggleWbFav(this)"><span class="material-symbols-outlined">star</span></button>'+
              '<span class="wbf-badge '+badgeCls+'">'+typeLabel+'</span>'+
              '<h3 class="wbf-front-title">'+wbEsc(bk.title)+'</h3>'+
              (bk.subtitle ? '<p class="wbf-front-sub">'+wbEsc(bk.subtitle)+'</p>' : '')+
              '<div class="wbf-front-foot">'+
                '<span class="wbf-count"><b>'+bk.count+'</b> '+L.words+'</span>'+
                '<span class="wbf-front-actions">'+
                  '<button class="wbf-allena" data-bank="'+wbEsc(bk.id)+'" data-act="allena" title="'+L.allena+'"><i class="fa-solid fa-bolt"></i> '+L.allena+'</button>'+
                  '<button class="wbf-menu" data-menu="'+wbEsc(bk.id)+'" title="Options"><i class="fa-solid fa-ellipsis-vertical"></i></button>'+
                '</span>'+
              '</div>'+
            '</div>'+
          '</div>'+
          '<div class="wbf-dd" data-dd="'+wbEsc(bk.id)+'">'+menuItems+'</div>'+
        '</article>';
      }

      // "New Project / Generate AI Clips" slot — second way to create a bank (AI-generated)
      function wbfAiSlot() {
        var L = wbFoldersLabels();
        return '<div class="wbf-new-ai" onclick="wbAiOpen()" data-wbf-ai>'+
          '<div class="wbf-ai-hover"><span class="wbf-ai-typing" data-wbf-type="'+wbEsc(L.ai_click)+'"></span></div>'+
          '<div class="wbf-ai-top"><div class="wbf-ai-icon">✦</div></div>'+
          '<div class="wbf-ai-bottom"><div><div class="wbf-ai-title">'+wbEsc(L.ai_title)+'</div><div class="wbf-ai-sub">'+wbEsc(L.ai_sub)+'</div></div></div>'+
        '</div>';
      }

      function wbFoldersLabels() {
        return {
          pinned: wbFldT('wb_folders_pinned'),
          smart: wbFldT('wb_folders_smart'),
          yours: wbFldT('wb_folders_yours'),
          words: wbFldT('wb_folders_words'),
          open: wbFldT('wb_folders_open'),
          allena: wbFldT('learner_train'),
          rename: wbFldT('wb_folders_rename'),
          duplicate: wbFldT('wb_folders_duplicate'),
          delete: wbFldT('wb_folders_delete'),
          new: wbFldT('wb_folders_new'),
          ai_title: wbFldT('wb_folders_ai_title'),
          ai_sub: wbFldT('wb_folders_ai_sub'),
          ai_click: wbFldT('wb_folders_ai_click'),
          fav_add: wbFldT('wb_folders_fav'),
          fav_remove: wbFldT('wb_folders_unfav')
        };
      }

      function wbSmartSectionHtml(smartArr, L, lang) {
        return '<section class="wbf-section" data-wbf-sec="smart">'+
          '<h4 class="wbf-section-label"><span class="wbf-dot" style="background:#06b6d4"></span>'+L.smart+'</h4>'+
          '<div class="wbf-grid">'+smartArr.map(function(bk){ return wbFolderCard(bk, L, lang); }).join('')+'</div>'+
        '</section>';
      }

      function wbFoldersHtml(folders, smartHtml, lang) {
        var L = wbFoldersLabels();
        var html = '';
        function section(key, label, dot, items) {
          if (!items || !items.length) return '';
          var gridHtml = items.map(function(bk){ return wbFolderCard(bk, L, lang); }).join('');
          return '<section class="wbf-section" data-wbf-sec="'+key+'">'+
            '<h4 class="wbf-section-label"><span class="wbf-dot" style="background:'+dot+'"></span>'+label+'</h4>'+
            '<div class="wbf-grid">'+gridHtml+'</div></section>';
        }
        if (folders.pinned && folders.pinned.length) html += section('pinned', L.pinned, '#d97706', folders.pinned);
        if (smartHtml) html += smartHtml;
        // Custom section — always shown (hosts the "new bank" slots: standard + AI)
        var customGrid = (folders.custom || []).map(function(bk){ return wbFolderCard(bk, L, lang); }).join('');
        customGrid += wbfAiSlot();
        customGrid += '<div class="wbf-new" onclick="wbFolderNew()"><div class="wbf-new-plus">+</div><div class="wbf-new-label">'+L.new+'</div></div>';
        html += '<section class="wbf-section" data-wbf-sec="custom">'+
          '<h4 class="wbf-section-label"><span class="wbf-dot" style="background:#059669"></span>'+L.yours+'</h4>'+
          '<div class="wbf-grid">'+customGrid+'</div></section>';
        return html;
      }

      async function renderWbFolders(lang, gridEl) {
        // lang: 'en'|'it'; gridEl: the .wbf-view grid container (optional — falls back to #wbFoldersGrid)
        lang = lang || window.SOTTOTITOLI_STUDY_LANG || 'en';
        var grid = gridEl || document.getElementById('wbFoldersGrid');
        if (!grid) return;
        grid.innerHTML = '<div class="wbf-loading"><div class="wbf-spinner"></div>'+wbFldT('wb_folders_loading')+'</div>';

        // Start smart refresh early (async) so pinned/custom render fast
        var smartPromise = (window.SMART_SUGGESTIONS && window.SMART_SUGGESTIONS.refreshAll)
          ? wbTimeout(window.SMART_SUGGESTIONS.refreshAll(lang), 8000, null)
          : Promise.resolve(null);

        var folders = { pinned: [], smart: null, custom: [] };
        try {
          var sb = window.sottotitoliSupabase;
          var nowISO = new Date().toISOString();
          // ── Pinned + banks — all independent, fetch in parallel ──
          var statsP = wbTimeout(SottotitoliData.getWordbankStats(lang), 2000, null);
          var banksP = wbTimeout(SottotitoliData.getWordbanks(lang), 2500, []);
          var dueCP = sb ? wbTimeout(sb.from('review_words').select('*', { count:'exact', head:true }).or('next_review_at.lte.'+nowISO+',is_new.eq.true'), 2000, { count: 0 }) : Promise.resolve({ count: 0 });
          var fragCP = sb ? wbTimeout(sb.from('review_words').select('*', { count:'exact', head:true }).or('mastery_score.lt.40,lapses.gte.2'), 2000, { count: 0 }) : Promise.resolve({ count: 0 });
          var sessP = sb ? wbTimeout(sb.auth.getSession(), 2000, { data: null }) : Promise.resolve({ data: null });

          var all = await Promise.all([statsP, banksP, dueCP, fragCP, sessP]);
          var stats = all[0], banks = all[1], dueC = all[2], fragC = all[3], sess = all[4];

          var pinCounts = { review_due_now: 0, saved_from_sessions: 0, fragile_words: 0, vocab_builder_en: 0 };
          if (dueC && dueC.count != null) pinCounts.review_due_now = dueC.count;
          if (fragC && fragC.count != null) pinCounts.fragile_words = fragC.count;
          if (stats && stats.totalWords > 0) pinCounts.saved_from_sessions = stats.totalWords;

          var uid = sess && sess.data && sess.data.session ? sess.data.session.user.id : null;
          var pinWords = { review_due_now: [], saved_from_sessions: [], fragile_words: [], vocab_builder_en: [] };

          // ── Preview words — parallel ──
          async function wbPv(bankId) {
            var ws = await wbTimeout(SottotitoliData.getWordbankWords(bankId), 1800, []);
            return (ws || []).slice(0,5).map(function(w){ return { word:w.word || w.lemma || '', cefr:w.cefr || w.cefr_level || '' }; });
          }
          var dueWP = uid ? wbTimeout(sb.from('review_words').select('lemma,cefr').eq('user_id',uid).eq('lang',lang).or('next_review_at.lte.'+nowISO+',is_new.eq.true').limit(5), 1800, { data: [] }) : Promise.resolve({ data: [] });
          var fragWP = uid ? wbTimeout(sb.from('review_words').select('lemma,cefr').eq('user_id',uid).eq('lang',lang).or('mastery_score.lt.40,lapses.gte.2').limit(5), 1800, { data: [] }) : Promise.resolve({ data: [] });

          var systemNames = ['Saved from sessions','Build From Known','New Words','Saved For Later','All Looked-Up Words','English Vocabulary Builder','Italian Vocabulary Builder'];
          var customBanks = (banks || []).filter(function(b){ return systemNames.indexOf(b.name) === -1; });
          var sfBank = null, vbBank = null;
          (banks || []).forEach(function(b){
            if (b.name === 'Saved from sessions') sfBank = b;
            if (b.name === 'English Vocabulary Builder') vbBank = b;
          });
          var sfP = sfBank ? wbPv(sfBank.id) : Promise.resolve([]);
          var vbP = vbBank ? wbPv(vbBank.id) : Promise.resolve([]);
          var customP = customBanks.map(function(b){ return wbPv(b.id); });

          var prevAll = await Promise.all([dueWP, fragWP, sfP, vbP].concat(customP));
          pinWords.review_due_now = (prevAll[0].data || []).map(function(r){ return { word:r.lemma, cefr:r.cefr }; });
          pinWords.fragile_words = (prevAll[1].data || []).map(function(r){ return { word:r.lemma, cefr:r.cefr }; });
          pinWords.saved_from_sessions = prevAll[2] || [];
          if (sfBank) pinCounts.saved_from_sessions = Math.max(pinCounts.saved_from_sessions, (prevAll[2]||[]).length);
          pinWords.vocab_builder_en = prevAll[3] || [];
          if (vbBank) pinCounts.vocab_builder_en = (prevAll[3]||[]).length;

          folders.pinned = [
            { id:'review_due_now', title:'Ripasso immediato', subtitle:'Parole da ripassare ora o in ritardo', count:pinCounts.review_due_now, words:pinWords.review_due_now, type:'pinned' },
            { id:'saved_from_sessions', title:'Saved From Sessions', subtitle:'Words you saved during live sessions', count:pinCounts.saved_from_sessions, words:pinWords.saved_from_sessions, type:'pinned' },
            { id:'vocab_builder_en', title:'English Vocabulary Builder', subtitle:'Words saved from Vocabulary Builder search', count:pinCounts.vocab_builder_en, words:pinWords.vocab_builder_en, type:'pinned' },
            { id:'fragile_words', title:'Fragile Words', subtitle:'Weak words at risk of being forgotten', count:pinCounts.fragile_words, words:pinWords.fragile_words, type:'pinned' }
          ];

          // ── Custom ──
          for (var i=0;i<customBanks.length;i++) {
            var cw = prevAll[4+i] || [];
            folders.custom.push({ id:customBanks[i].id, title:customBanks[i].name || 'Banca', subtitle:customBanks[i].description || '', count:cw.length, words:cw, type:'custom' });
          }
        } catch(err) { console.warn('Folders (pinned/custom) error:', err); }

        // Render pinned + custom now, smart as skeleton
        var L = wbFoldersLabels();
        var skel = '<section class="wbf-section" data-wbf-sec="smart"><h4 class="wbf-section-label"><span class="wbf-dot" style="background:#06b6d4"></span>'+L.smart+'</h4><div class="wbf-grid">'+new Array(7).join('<div class="wbf-skel"></div>')+'</div></section>';
        grid.innerHTML = wbFoldersHtml(folders, skel, lang);
        wbFoldersBind(grid);

        // ── Smart (async fill-in) ──
        try {
          var smartAll = await smartPromise;
          var smartDefs = [
            { id:'goal_next_step', title:'Next Step For Your Goal', subtitle:'Goal-aligned vocabulary for your profile' },
            { id:'build_from_known', title:'Build From What You Know', subtitle:'Higher-level replacements for words you know' },
            { id:'activate_recognized', title:'Activate What You Recognize', subtitle:'Passive vocabulary — words seen but not claimed' },
            { id:'upcoming_useful_vocab', title:'Goal-Based Upcoming Vocab', subtitle:'Words for your declared short-term goals' },
            { id:'upcoming_session_driven', title:'Session-Detected Themes', subtitle:'Predicted needs from your recent session topics' },
            { id:'upcoming_roadmap', title:'Your Learning Roadmap', subtitle:'Staged vocabulary for your goal journey' }
          ];
          var smartArr = [];
          if (smartAll) {
            smartDefs.forEach(function(d){
              var list = smartAll[d.id] || [];
              smartArr.push({ id:d.id, title:d.title, subtitle:d.subtitle, count:list.length, words:list.slice(0,5).map(function(w){ return { word:w.word||'', cefr:w.cefr||'' }; }), type:'smart' });
            });
          }
          if (smartArr.length) {
            var oldSmart = grid.querySelector('[data-wbf-sec="smart"]');
            if (oldSmart) oldSmart.outerHTML = wbSmartSectionHtml(smartArr, L, lang);
          }
        } catch(err) { console.warn('Folders (smart) error:', err); }
      }
      window.renderWbFolders = renderWbFolders;

      // Favourite toggle for folder cards + Overview pin cards (lang-aware).
      window.toggleWbFav = function(starEl) {
        if (!starEl) return;
        var bankId = starEl.getAttribute('data-bank');
        var lang = starEl.getAttribute('data-lang') || (window.SOTTOTITOLI_STUDY_LANG || 'en');
        var key = lang === 'it' ? 'sottotitoli-fav-banks-it' : 'sottotitoli-fav-banks';
        var favs = [];
        try { favs = JSON.parse(localStorage.getItem(key) || '[]'); } catch(e) {}
        var idx = favs.indexOf(bankId);
        var on;
        if (idx >= 0) { favs.splice(idx, 1); on = false; }
        else { favs.push(bankId); on = true; }
        localStorage.setItem(key, JSON.stringify(favs));
        starEl.classList.toggle('on', on);
        starEl.title = on ? wbFldT('wb_folders_unfav') : wbFldT('wb_folders_fav');
        if (typeof renderWbOverviewSections === 'function') setTimeout(renderWbOverviewSections, 200);
      };

      function wbFolderOpen(id) {
        if (id === 'build_from_known') {
          var vocNav = document.querySelector('[data-panel="vocabulary-builder"]');
          if (vocNav) vocNav.click();
          setTimeout(function(){ var wbTab = document.querySelector('[data-subtab="wb-expand"]'); if (wbTab) wbTab.click(); }, 150);
          return;
        }
        // Open in the currently-active language subtab (EN or IT)
        var itActive = document.querySelector('[data-subtab="wb-overview-it"][aria-selected="true"]');
        var tab = itActive ? document.querySelector('[data-subtab="wb-overview-it"]') : document.querySelector('[data-subtab="wb-overview"]');
        if (tab) tab.click();
        setTimeout(function(){ if (window.openWordbankView) openWordbankView(id); }, 260);
      }
      window.wbFolderOpen = wbFolderOpen;

      // Favorite-collection click from the Overview: switch to the bank's language
      // subtab FIRST, then open it, so the user lands directly on the open bank.
      window.wbOpenFav = function (bankId, lang, system) {
        if (system) { if (window.wbFolderOpen) { wbFolderOpen(bankId); return; } }
        var it = lang === 'it';
        var tabSel = it ? 'wb-overview-it' : 'wb-overview';
        var tab = document.querySelector('#pnl-wordbanks .tab-link[data-subtab="' + tabSel + '"]');
        if (tab && !tab.classList.contains('active')) tab.click();
        setTimeout(function () {
          var fn = it ? (window.wbOpenBankIt || window.wbOpenBank) : (window.wbOpenBank || window.wbOpenBankIt);
          if (fn) fn(bankId);
        }, 80);
      };

      function wbFolderNew() {
        // Open the stylish create-bank popup (shared) instead of a raw prompt()
        if (window.wbShowCreate) window.wbShowCreate();
        else if (window.newWordbank) window.newWordbank();
        setTimeout(wbRenderActive, 1200);
      }
      window.wbFolderNew = wbFolderNew;

      // Refresh the folder grid of the currently-visible language subtab (EN or IT)
      function wbRenderActive() {
        var itActive = document.querySelector('[data-subtab="wb-overview-it"][aria-selected="true"]');
        var enActive = document.querySelector('[data-subtab="wb-overview"][aria-selected="true"]');
        var lang, gridId;
        if (itActive) { lang = 'it'; gridId = 'wbFoldersGridIt'; }
        else if (enActive) { lang = 'en'; gridId = 'wbFoldersGridEn'; }
        else { lang = window.SOTTOTITOLI_STUDY_LANG || 'en'; gridId = lang === 'it' ? 'wbFoldersGridIt' : 'wbFoldersGridEn'; }
        var g = document.getElementById(gridId);
        if (g && window.renderWbFolders) window.renderWbFolders(lang, g);
      }
      window.wbRenderActive = wbRenderActive;

      // ── AI word-bank generation ("New Project / Generate AI Clips") ──
      var wbAiLang = window.SOTTOTITOLI_STUDY_LANG || 'en';
      // Language picker for the AI popup — English or Italiano (drives the fetched words + bank target)
      function wbAiRefreshLangUI() {
        var en = document.getElementById('wbAiLangEn'), it = document.getElementById('wbAiLangIt');
        var onIt = wbAiLang === 'it';
        // Highlight the word-bank language picker (English / Italiano) — this is the
        // setting for which language the generated words should be + the destination
        // bank. It must NOT change the popup UI language: that follows the app i18n.
        if (en) { en.style.background = onIt ? 'transparent' : 'rgba(6,182,212,.25)'; en.style.borderColor = onIt ? 'transparent' : 'rgba(6,182,212,.5)'; en.style.color = onIt ? 'rgba(255,255,255,.55)' : '#7dd3fc'; }
        if (it) { it.style.background = onIt ? 'rgba(6,182,212,.25)' : 'transparent'; it.style.borderColor = onIt ? 'rgba(6,182,212,.5)' : 'transparent'; it.style.color = onIt ? '#7dd3fc' : 'rgba(255,255,255,.55)'; }
      }
      window.wbAiPickLang = function(lang){ wbAiLang = lang; wbAiRefreshLangUI(); };
      function wbAiOpen() {
        var itTab = document.querySelector('[data-subtab="wb-overview-it"][aria-selected="true"]');
        wbAiLang = itTab ? 'it' : (window.SOTTOTITOLI_STUDY_LANG || 'en');
        var pop = document.getElementById('wbAiPopup');
        if (!pop) return;
        // Close any other wordbank popups so only the AI modal is visible
        var imp = document.getElementById('wbImportPopup'); if (imp) imp.style.display = 'none';
        var cre = document.getElementById('wbCreatePopup'); if (cre) cre.style.display = 'none';
        var nameEl = document.getElementById('wbAiName');
        var topicEl = document.getElementById('wbAiTopic');
        if (nameEl) nameEl.value = '';
        if (topicEl) topicEl.value = '';
        wbAiRefreshLangUI();
        var errEl = document.getElementById('wbAiError');
        if (errEl) errEl.style.display = 'none';
        var statusEl = document.getElementById('wbAiStatus');
        if (statusEl) statusEl.style.display = 'none';
        pop.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        setTimeout(function(){ if (topicEl) topicEl.focus(); }, 120);
      }
      window.wbAiOpen = wbAiOpen;

      /* ── Hero vocabulary search: EN/IT flag toggle → jumps to the matching VB tab ── */
      window.__heroVocabLang = 'en';
      function heroVocabToggleLang() {
        window.__heroVocabLang = (window.__heroVocabLang === 'en') ? 'it' : 'en';
        var btn = document.getElementById('heroVocabLang'); if (!btn) return;
        btn.textContent = (window.__heroVocabLang === 'en') ? '🇬🇧' : '🇮🇹';
        var t = (window.__heroVocabLang === 'en')
          ? (window.I18n && window.I18n.t ? window.I18n.t('hero_vocab_lang_en') : 'Cerca nel vocabolario inglese')
          : (window.I18n && window.I18n.t ? window.I18n.t('hero_vocab_lang_it') : 'Cerca nel vocabolario italiano');
        btn.title = t; btn.setAttribute('aria-label', t);
        var inp = document.getElementById('heroVocabSearch'); if (inp) inp.focus();
      }
      window.heroVocabToggleLang = heroVocabToggleLang;
      function heroVocabLookup() {
        var inp = document.getElementById('heroVocabSearch'); var w = (inp ? inp.value : '').trim(); if (!w) return;
        var it = (window.__heroVocabLang === 'it');
        var vbNav = document.querySelector('[data-panel="vocabulary-builder"]'); if (vbNav) vbNav.click();
        setTimeout(function () {
          var tab = document.querySelector('#pnl-vocabulary-builder .tab-link[data-subtab="' + (it ? 'wb-expand-it' : 'wb-expand') + '"]'); if (tab) tab.click();
          setTimeout(function () {
            var sid = it ? 'wbItExpandSearch' : 'wbExpandSearch'; var inp2 = document.getElementById(sid);
            if (!inp2) return;
            inp2.value = w;
            if (it) { if (window.renderItExpandSuggestions) window.renderItExpandSuggestions(); }
            else if (window.renderExpandSuggestions) window.renderExpandSuggestions();
          }, 280);
        }, 140);
      }
      window.heroVocabLookup = heroVocabLookup;

      function wbAiClose() {
        var pop = document.getElementById('wbAiPopup');
        if (pop) pop.style.display = 'none';
        document.body.style.overflow = '';
      }
      window.wbAiClose = wbAiClose;

      function wbAiType(el) {
        if (!el) return;
        var txt = el.getAttribute('data-wbf-type') || 'Click to start...';
        el.textContent = '';
        var i = 0;
        var timer = setInterval(function(){
          if (i <= txt.length) {
            el.textContent = txt.slice(0, i);
            if (i === txt.length) {
              var caret = document.createElement('span');
              caret.className = 'wbf-ai-caret';
              el.appendChild(caret);
            }
            i++;
          } else clearInterval(timer);
        }, 45);
        el._wbfTimer = timer;
      }
      window.wbAiType = wbAiType;

      async function wbAiGenerate() {
        var t = function(k){ return (window.I18n && window.I18n.t) ? window.I18n.t(k) : k; };
        var topic = (document.getElementById('wbAiTopic') || {}).value || '';
        var name = (document.getElementById('wbAiName') || {}).value || '';
        var errEl = document.getElementById('wbAiError');
        var btn = document.getElementById('wbAiBtn');
        var statusEl = document.getElementById('wbAiStatus');
        if (!topic.trim()) { if (errEl) errEl.textContent = t('wb_ai_err_topic'); errEl.style.display='block'; return; }
        if (!name.trim()) { if (errEl) errEl.textContent = t('wb_ai_err_name'); errEl.style.display='block'; return; }
        if (!window.sottotitoliSupabase) { if (errEl) errEl.textContent = 'Auth required.'; errEl.style.display='block'; return; }
        if (btn) { btn.disabled = true; btn.innerHTML = '<span style="font-size:15px">✦</span> ' + t('wb_ai_generating'); }
        if (errEl) errEl.style.display = 'none';
        if (statusEl) { statusEl.style.display = 'block'; statusEl.textContent = t('wb_ai_building'); }

        try {
          var sess = await window.sottotitoliSupabase.auth.getSession();
          var token = sess && sess.data && sess.data.session ? sess.data.session.access_token : null;
          var cfg = (window.SOTTOTITOLI_CONFIG && window.SOTTOTITOLI_CONFIG.sottotitoli) ? window.SOTTOTITOLI_CONFIG.sottotitoli : (window.SOTTOTITOLI_CONFIG || {});
          var url = cfg.generateWordBankUrl || '';
          if (!url && cfg.generateLearnerContentUrl) { url = cfg.generateLearnerContentUrl.replace('generate-learner-content','generate-word-bank'); }
          if (!url) { url = 'https://qzqmuegbpmvqrjrlfbgk.supabase.co/functions/v1/generate-word-bank'; }
          var resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (token || '') },
            body: JSON.stringify({ topic: topic.trim(), name: name.trim() || undefined, target: wbAiLang, count: 14 })
          });
          var result = await resp.json().catch(function(){ return {}; });
          if (!resp.ok || result.error) {
            if (errEl) { errEl.textContent = (result && result.error) || 'Generation failed'; errEl.style.display='block'; }
            if (statusEl) statusEl.style.display='none';
            return;
          }
          // Success
          if (statusEl) statusEl.textContent = t('wb_ai_done_pre') + (result.wordCount||0) + ' ' + t('wb_ai_words');
          setTimeout(function(){
            aiWbMarkUsed();
            wbAiClose();
            if (typeof SottotitoliData.cacheClear === 'function') SottotitoliData.cacheClear();
            // Direct the user to the Word Banks panel + the language chosen in the AI popup
            var wbNav = document.querySelector('[data-panel="wordbanks"]');
            if (wbNav) wbNav.click();
            setTimeout(function(){
              var target = wbAiLang === 'it' ? 'wb-overview-it' : 'wb-overview';
              var tab = document.querySelector('[data-subtab="'+target+'"]');
              if (tab) tab.click();
              wbRenderActive();
              if (result.bank && window.openWordbankView) { try { window.openWordbankView(result.bank.id); } catch(e){} }
            }, 350);
          }, 700);
        } catch(err) {
          if (errEl) { errEl.textContent = err.message || 'Generation failed'; errEl.style.display='block'; }
          if (statusEl) statusEl.style.display='none';
        } finally {
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<span style="font-size:15px">✦</span> <span data-i18n="wb_ai_gen">' + t('wb_ai_gen') + '</span>';
            if (window.I18n && window.I18n.apply) window.I18n.apply(btn);
          }
        }
      }
      window.wbAiGenerate = wbAiGenerate;

      // ── Hero AI word-list box: daily quota (3/day, reset at midnight) ──
      function aiWbGetUsed(){ try { var d=JSON.parse(localStorage.getItem('sottotitoli-ai-wb-daily')||'null'); var t=new Date().toISOString().slice(0,10); if(!d||d.date!==t) return 0; return d.used||0; } catch(e){ return 0; } }
      function aiWbMarkUsed(){ var t=new Date().toISOString().slice(0,10); var used=aiWbGetUsed()+1; try{ localStorage.setItem('sottotitoli-ai-wb-daily', JSON.stringify({date:t,used:used})); }catch(e){} updateHeroAiWbCount(); return used; }
      function updateHeroAiWbCount(){ var el=document.getElementById('heroAiWbLeft'); if(!el) return; el.textContent=Math.max(0,3-aiWbGetUsed())+'/3'; }
      window.updateHeroAiWbCount = updateHeroAiWbCount;

      function wbFoldersCloseMenus() {
        ['wbFoldersGrid','wbFoldersGridEn','wbFoldersGridIt'].forEach(function(id){
          var grid = document.getElementById(id);
          if (!grid) return;
          grid.querySelectorAll('.wbf-dd.open').forEach(function(o){ o.classList.remove('open'); });
          grid.querySelectorAll('.wbf-menu-open').forEach(function(m){ m.classList.remove('wbf-menu-open'); });
        });
      }

      function wbFoldersBind(grid) {
        if (!grid || grid.__wbfBound) return;
        grid.__wbfBound = true; // bind delegated listener once — re-renders reuse it
        // Typewriter on hover for the AI slot
        grid.addEventListener('mouseover', function(e){
          var ai = e.target.closest('[data-wbf-ai]');
          if (!ai) return;
          var typing = ai.querySelector('.wbf-ai-typing');
          if (typing && !typing._wbfStarted) {
            typing._wbfStarted = true;
            if (window.wbAiType) wbAiType(typing);
          }
        });
        grid.addEventListener('click', function(e){
          var ai = e.target.closest('[data-wbf-ai]');
          if (ai) { e.stopPropagation(); if (window.wbAiOpen) wbAiOpen(); return; }
          var menuBtn = e.target.closest('.wbf-menu');
          var actBtn = e.target.closest('.wbf-dd button');
          var dd = e.target.closest('.wbf-dd');
          var allenaBtn = e.target.closest('.wbf-allena');
          var folder = e.target.closest('.wbf-folder');
          if (menuBtn) {
            e.stopPropagation();
            var id = menuBtn.getAttribute('data-menu');
            var target = grid.querySelector('[data-dd="'+id+'"]');
            var wasOpen = target && target.classList.contains('open');
            wbFoldersCloseMenus();
            if (target && !wasOpen) { target.classList.add('open'); menuBtn.classList.add('wbf-menu-open'); }
            return;
          }
          if (actBtn) {
            e.stopPropagation();
            var act = actBtn.getAttribute('data-act');
            var bid = actBtn.getAttribute('data-bank');
            var bname = actBtn.getAttribute('data-name') || '';
            wbFoldersCloseMenus();
            if (act === 'open') { wbFolderOpen(bid); return; }
            if (act === 'allena') { if (window.Learner && Learner.openBankTest) Learner.openBankTest(bid); return; }
            if (act === 'rename') { if (window.wbRenameBank) wbRenameBank(bid, bname); setTimeout(wbRenderActive, 900); return; }
            if (act === 'duplicate') { if (window.wbDuplicateBank) wbDuplicateBank(bid); setTimeout(wbRenderActive, 1200); return; }
            if (act === 'delete') { if (window.wbDeleteBank) wbDeleteBank(bid, bname); return; }
            return;
          }
          if (dd) { e.stopPropagation(); wbFoldersCloseMenus(); return; }
          if (allenaBtn) {
            e.stopPropagation();
            var abid = allenaBtn.getAttribute('data-bank');
            if (window.Learner && Learner.openBankTest) Learner.openBankTest(abid);
            return;
          }
          if (folder) { wbFolderOpen(folder.getAttribute('data-bank-id')); return; }
          wbFoldersCloseMenus();
        });
      }

      // Close folder menus when clicking anywhere else
      document.addEventListener('click', function(e){
        if (!e.target.closest('#wbFoldersGrid, #wbFoldersGridEn, #wbFoldersGridIt')) wbFoldersCloseMenus();
      });

      // ── Open inside-bank view (replaces overview content) ──
      async function openWordbankView(bankId) {
        // Detect which collection tab is active
        var itTab = document.querySelector('[data-subtab="wb-overview-it"][aria-selected="true"]');
        var isItalian = !!itTab;
        var overviewId = isItalian ? 'wordbanksItOverview' : 'wordbanksOverview';
        var insideId = isItalian ? 'wbItInsideView' : 'wbInsideView';

        var overviewEl = document.getElementById(overviewId);
        var insideEl = document.getElementById(insideId);
        if (!overviewEl || !insideEl) return;
        // Also hide the loading placeholder
        var enContent = document.getElementById('wbEnContent');
        if (enContent) enContent.style.display = 'none';
        // Hide overview filter chips + search bar too (they're siblings, not children of overviewEl)
        var searchBar = document.querySelector(isItalian ? '#sub-wb-overview-it .wb-search-bar' : '#sub-wb-overview .wb-search-bar');
        if (searchBar) searchBar.style.display = 'none';
        overviewEl.style.display = 'none';
        insideEl.style.display = 'block';
        _wbState.currentBank = bankId;
        _wbState.selectedRows = new Set();

        var lang = isItalian ? 'it' : (window.SOTTOTITOLI_STUDY_LANG || 'en');
        var banks = await SottotitoliData.getWordbanks(lang);
        var bank = banks.find(function(b){return b.id === bankId;});
        // For pinned/smart banks, resolve the actual bank UUID for delete operations
        _wbState.currentBankUUID = bank ? bank.id : null;
        if (!_wbState.currentBankUUID && bankId === 'saved_from_sessions') {
          var sfBank = banks.find(function(b){ return b.name === 'Saved from sessions'; });
          if (sfBank) _wbState.currentBankUUID = sfBank.id;
        }
        if (!_wbState.currentBankUUID && bankId === 'it_saved_sessions') {
          var itSfBank = banks.find(function(b){ return b.name === 'Saved from sessions'; });
          if (itSfBank) _wbState.currentBankUUID = itSfBank.id;
        }

        var bankNames = {
          'review_due_now':'Ripasso immediato',
          'saved_from_sessions':'Salvate dalle sessioni','fragile_words':'Parole fragili',
          'goal_next_step':'Prossimo passo per il tuo obiettivo','build_from_known':'Costruisci da ciò che conosci',
          'activate_recognized':'Attiva ciò che riconosci','upcoming_useful_vocab':'Vocabolario utile in arrivo',
          'upcoming_session_driven':'Temi rilevati dalle sessioni','upcoming_roadmap':'Il tuo percorso di apprendimento',
          'it_review_due':'Ripasso immediato','it_saved_sessions':'Salvate da sessioni',
          'it_vocab_builder':'Italian Vocabulary Builder',
          'it_new_weekly':'Nuove questa settimana','it_fragile':'Parole Fragili',
          'vocab_builder_en':'English Vocabulary Builder',
          'it_next_step':'Prossimo passo','it_build_known':'Costruisci da ciò che sai',
          'it_activate':'Attiva ciò che riconosci'
        };
        var bankTypes = {
          'review_due_now':'pinned',
          'saved_from_sessions':'pinned','fragile_words':'pinned',
          'goal_next_step':'smart','build_from_known':'smart',
          'activate_recognized':'smart','upcoming_useful_vocab':'smart',
          'upcoming_session_driven':'smart','upcoming_roadmap':'smart',
          'it_review_due':'pinned','it_saved_sessions':'pinned',
          'it_vocab_builder':'pinned',
          'it_new_weekly':'pinned','it_fragile':'pinned',
          'vocab_builder_en':'pinned',
          'it_next_step':'smart','it_build_known':'smart',
          'it_activate':'smart'
        };
        var bankSubtitles = {
          'review_due_now':'Parole pronte per il ripasso immediato',
          'saved_from_sessions':'Parole salvate durante l\'uso',
          'fragile_words':'Parole che hanno bisogno di rinforzo',
          'goal_next_step':'Suggerite per il tuo obiettivo attuale',
          'build_from_known':'Parole collegate al tuo vocabolario esistente',
          'activate_recognized':'Trasforma il riconoscimento in uso attivo',
          'upcoming_useful_vocab':'Suggerite per i prossimi passi',
          'it_review_due':'Parole italiane pronte per il ripasso',
          'it_saved_sessions':'Parole italiane salvate durante le sessioni',
          'it_vocab_builder':'Parole italiane aggiunte con + dal Vocabulary Builder',
          'it_new_weekly':'Parole italiane raccolte di recente',
          'vocab_builder_en':'Parole inglesi salvate dal Vocabulary Builder',
          'it_fragile':'Parole italiane a rischio',
          'it_next_step':'Vocabolario italiano per i tuoi obiettivi',
          'it_build_known':'Progressione lessicale italiana',
          'it_activate':'Parole che capisci ma non usi ancora'
        };
        var bankEmptyStates = {
          'review_due_now':'Tutto in ordine per ora.',
          'saved_from_sessions':'Non hai ancora salvato parole dalle sessioni.',
          'fragile_words':'Nessuna parola fragile al momento.',
          'goal_next_step':'Nessun suggerimento basato sugli obiettivi.',
          'build_from_known':'Nessun vocabolo collegato disponibile.',
          'activate_recognized':'Nessun candidato per l\'attivazione.',
          'upcoming_useful_vocab':'Nessun vocabolario in coda.',
          'upcoming_session_driven':'Non abbastanza dati sulle sessioni per rilevare temi.',
          'upcoming_roadmap':'Definisci le tappe del tuo obiettivo per sbloccare.',
          'it_review_due':'Tutto in ordine per ora.',
          'it_saved_sessions':'Non hai ancora salvato parole italiane dalle sessioni.',
          'it_vocab_builder':'Nessuna parola italiana salvata. Usa il + sui chip di traduzione nel Vocabulary Builder.',
          'it_new_weekly':'Nessuna nuova parola italiana questa settimana.',
          'vocab_builder_en':'No words saved yet. Use + on cards in Vocabulary Builder > English.',
          'it_fragile':'Nessuna parola italiana fragile al momento.',
          'it_next_step':'Nessun suggerimento basato sugli obiettivi.',
          'it_build_known':'Nessun vocabolo collegato disponibile.',
          'it_activate':'Nessun candidato per l\'attivazione.'
        };

        var name = bank ? bank.name : (bankNames[bankId] || bankId);
        var type = bank ? 'custom' : (bankTypes[bankId] || 'pinned');
        _wbState.currentBankType = type;  // store type for delete routing
        var subtitle = bank ? (bank.description || '') : (bankSubtitles[bankId] || '');
        var emptyMsg = bankEmptyStates[bankId] || 'No words yet.';
        var badgeClass = type === 'pinned' ? 'badge-pinned' : type === 'smart' ? 'badge-smart' : 'badge-custom';
        var typeLabel = type === 'pinned' ? 'PINNED' : type === 'smart' ? 'SMART' : 'YOURS';
        var primaryAction = type === 'pinned' ? 'Start review' : type === 'smart' ? 'Move selected to Yours' : 'Manage collection';

        var words = [];
        if (bank) {
          // Custom bank: fetch from user_wordbank_words
          words = await SottotitoliData.getWordbankWords(bank.id);
        } else if (bankId === 'saved_from_sessions') {
          // Pinned "Saved From Sessions" — fetch from the actual user bank created by caption sync
          var sfBank = banks.find(function(b){ return b.name === 'Saved from sessions'; });
          if (sfBank) {
            words = await SottotitoliData.getWordbankWords(sfBank.id);
            // Enrich with CEFR from local lookup
            words.forEach(function(w) {
              if (!w.cefr && !w.cefr_level && window.CEFR_LEVELS) {
                var cefr = window.CEFR_LEVELS[w.word.toLowerCase()];
                if (cefr) { w.cefr = cefr; w.cefr_level = cefr; }
              }
            });
          }
        } else if (bankId === 'review_due_now' || bankId === 'fragile_words' || bankId === 'it_review_due' || bankId === 'it_fragile') {
          // Pinned banks 1,3 — query review_words directly (words from Pipeline 1)
          // Italian variants (it_review_due, it_fragile) use the same logic with lang='it'
          try {
            var sbClient = window.sottotitoliSupabase;
            if (!sbClient) { /* skip */ }
            else {
              var rSession = await sbClient.auth.getSession();
              if (!rSession.data?.session) { /* not logged in — leave empty */ }
              else {
                var userId = rSession.data.session.user.id;
                var bankLang = (bankId === 'it_review_due' || bankId === 'it_fragile') ? 'it' : (isItalian ? 'it' : 'en');
                var query = sbClient.from('review_words').select('*').eq('user_id', userId).eq('lang', bankLang).limit(200);
                var nowISO = new Date().toISOString();
                if (bankId === 'review_due_now' || bankId === 'it_review_due') {
                  query = query.or('next_review_at.lte.' + nowISO + ',is_new.eq.true');
                } else if (bankId === 'fragile_words' || bankId === 'it_fragile') {
                  query = query.or('mastery_score.lt.40,lapses.gte.2');
                }
                var { data: rwData } = await query;
                if (rwData && rwData.length) {
                  var seen = {};
                  words = [];
                  rwData.forEach(function(r) {
                    var key = (r.lemma || '').toLowerCase();
                    if (!seen[key]) {
                      seen[key] = true;
                      words.push({
                        id: r.id, word: r.lemma, lemma: r.lemma, pos: r.pos,
                        cefr: r.cefr, cefr_level: r.cefr, level: r.cefr,
                        usage_count: r.personal_frequency, frequency: r.personal_frequency, reps: r.reps,
                        status: r.review_state, source_type: r.source_type, lang: r.lang,
                        definition: r.translation_primary
                      });
                    }
                  });
                }
              }
            }
          } catch(e) { /* leave empty */ }
        } else if (bankId === 'it_vocab_builder') {
          // Pinned "Italian Vocabulary Builder" — read from localStorage (migrating to Supabase)
          try {
            var stored = JSON.parse(localStorage.getItem('sottotitoli_wb_it_pinned') || '{"words":[]}');
            words = (stored.words || []).map(function(w, i) {
              return { id: 'itvb_' + i, word: w, lemma: w, pos: '', lang: 'it', status: 'known', usage_count: 1 };
            });
          } catch(e) { /* leave empty */ }
        } else if (bankId === 'vocab_builder_en') {
          // Pinned "English Vocabulary Builder" — fetch from Supabase user_wordbank_words
          try {
            var vbBank = banks.find(function(b){ return b.name === 'English Vocabulary Builder'; });
            if (vbBank) { words = await SottotitoliData.getWordbankWords(vbBank.id); }
          } catch(e) { /* leave empty */ }
        } else if (bankId === 'it_saved_sessions') {
          // Italian "Saved from sessions" — fetch from actual user bank
          var itSfBank = banks.find(function(b){ return b.name === 'Saved from sessions' && b.lang === 'it'; });
          if (itSfBank) {
            words = await SottotitoliData.getWordbankWords(itSfBank.id);
          }
        } else if (type !== 'custom') {
          // Other pinned/smart bank: try to fetch real membership from review_bank_words
          try {
            var sbClient = window.sottotitoliSupabase;
            if (sbClient) {
              var { data: bwData } = await sbClient
                .from('review_bank_words')
                .select('word_id, review_words(*)')
                .eq('bank_key', bankId)
                .eq('status', 'active')
                .limit(100);
              if (bwData && bwData.length) {
                words = bwData.map(function(r) { return r.review_words; }).filter(Boolean);
              }
            }
          } catch(e) { /* leave empty */ }
        }
        // ── Enrich all words with CEFR + POS from local lookups ──
        var posLabels = { n:'noun', v:'verb', adj:'adjective', adv:'adverb', pron:'pronoun', prep:'preposition', conj:'conjunction', det:'determiner', num:'numeral', interj:'interjection' };
        words.forEach(function(w) {
          var wordKey = (w.word || w.lemma || '').toLowerCase();
          if (wordKey && window.CEFR_LEVELS && window.CEFR_LEVELS[wordKey] && !w.cefr && !w.cefr_level) {
            w.cefr = window.CEFR_LEVELS[wordKey];
            w.cefr_level = window.CEFR_LEVELS[wordKey];
          }
          if (wordKey && window.LEMMA_POS_MAP && window.LEMMA_POS_MAP[wordKey] && !w.pos && !w.part_of_speech) {
            w.pos = posLabels[window.LEMMA_POS_MAP[wordKey]] || window.LEMMA_POS_MAP[wordKey];
          }
        });
        _wbState.currentWords = words;

        insideEl.innerHTML =
          '<button class="back-btn hv-cyan-border" onclick="closeWordbankView()" style="display:inline-flex;align-items:center;gap:8px;padding:10px 20px;border-radius:100px;border:1.5px solid var(--line);background:var(--card);color:var(--text);font-family:var(--font-ui);font-size:13px;font-weight:600;cursor:pointer;transition:all .2s;margin-bottom:16px"><i class="fa-solid fa-arrow-left"></i> Back to overview</button>'+
          '<div class="glass-card" style="position:relative;overflow:hidden;min-height:500px;margin-bottom:24px;border-color:rgba(6,182,212,.15)">'+
            '<div style="position:absolute;inset:0;z-index:0;pointer-events:none">'+
              '<div style="position:absolute;top:-80px;left:-40px;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,rgba(6,182,212,.08),transparent 70%);filter:blur(40px)"></div>'+
              '<div style="position:absolute;bottom:-60px;right:-20px;width:250px;height:250px;border-radius:50%;background:radial-gradient(circle,rgba(139,92,246,.06),transparent 70%);filter:blur(40px)"></div>'+
              '<div style="position:absolute;inset:0;background:linear-gradient(to top,var(--bg),rgba(30,31,38,.7) 50%,rgba(30,31,38,.5))"></div>'+
            '</div>'+
            '<div style="position:relative;z-index:1;padding:28px 32px;display:flex;flex-direction:column;height:100%">'+
              '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:24px;flex-wrap:wrap">'+
                '<div>'+
                  '<h2 style="font-size:28px;font-weight:700;color:var(--text);margin:0 0 4px;letter-spacing:-.02em">'+name.toUpperCase()+'</h2>'+
                  '<p style="font-size:11px;font-weight:700;color:var(--text-soft);opacity:.6;text-transform:uppercase;letter-spacing:.15em;font-family:\'Inter\',sans-serif;margin:0">'+(subtitle||'')+'</p>'+
                '</div>'+
                '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">'+
                  '<button class="hv-lift" onclick="event.stopPropagation();if(window.Learner&&window.Learner.openBankTest)Learner.openBankTest(\''+bankId+'\')" style="display:inline-flex;align-items:center;gap:8px;padding:10px 22px;border-radius:100px;background:rgba(6,182,212,.12);color:var(--cyan);border:1px solid rgba(6,182,212,.35);font-size:11px;font-weight:700;font-family:\'Manrope\',sans-serif;text-transform:uppercase;letter-spacing:.06em;cursor:pointer;transition:all .2s;white-space:nowrap"><span class="material-symbols-outlined" style="font-size:18px">bolt</span> Allena</button>'+
                  '<button class="hv-bg-cyan" onclick="document.getElementById(\'wbAddWordInput\').focus()" style="display:inline-flex;align-items:center;gap:8px;padding:10px 22px;border-radius:100px;background:rgba(6,182,212,.1);color:var(--cyan);border:1px solid rgba(6,182,212,.3);font-size:11px;font-weight:700;font-family:\'Manrope\',sans-serif;text-transform:uppercase;letter-spacing:.06em;cursor:pointer;transition:all .2s;white-space:nowrap"><span class="material-symbols-outlined" style="font-size:18px">add</span> Aggiungi parola</button>'+
                '</div>'+
              '</div>'+
              '<div style="margin-bottom:16px;display:flex;gap:8px">'+
                '<input id="wbAddWordInput" placeholder="Scrivi una parola…" style="flex:1;max-width:320px;padding:10px 16px;border-radius:100px;border:1.5px solid var(--line);background:var(--bg);color:var(--text);font-size:13px;font-family:inherit;outline:none;transition:border-color .2s" onfocus="this.style.borderColor=\'var(--cyan)\'" onblur="this.style.borderColor=\'var(--line)\'" onkeydown="if(event.key===\'Enter\')wbAddWordToBank()">'+
                '<button class="c-btn-pill c-btn-pill--sm c-btn-pill--fade" onclick="wbAddWordToBank()"><i class="fa-solid fa-plus" style="margin-right:4px"></i>Add</button>'+
              '</div>'+
              (words.length === 0 ?
                '<div style="text-align:center;padding:60px 20px;color:var(--text-faint);flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center"><div style="font-size:48px;margin-bottom:12px">📭</div><p style="font-size:15px">'+emptyMsg+'</p></div>'
                :
                '<div style="overflow-x:auto;flex:1"><table class="wb-table" style="width:100%;border-collapse:collapse;min-width:600px"><thead><tr style="border-bottom:1px solid var(--line)"><th class="hv-cyan" onclick="wbSortTable(\'word\')" style="padding:14px 16px;font-size:11px;font-weight:700;color:var(--text-soft);text-transform:uppercase;letter-spacing:.08em;font-family:\'Manrope\',sans-serif;text-align:left;cursor:pointer;user-select:none">Parola <span class="wb-sort-arrow" data-col="word"></span></th><th class="hv-cyan" onclick="wbSortTable(\'pos\')" style="padding:14px 16px;font-size:11px;font-weight:700;color:var(--text-soft);text-transform:uppercase;letter-spacing:.08em;font-family:\'Manrope\',sans-serif;text-align:left;cursor:pointer;user-select:none">POS <span class="wb-sort-arrow" data-col="pos"></span></th><th class="hv-cyan" onclick="wbSortTable(\'cefr\')" style="padding:14px 16px;font-size:11px;font-weight:700;color:var(--text-soft);text-transform:uppercase;letter-spacing:.08em;font-family:\'Manrope\',sans-serif;text-align:left;cursor:pointer;user-select:none">CEFR <span class="wb-sort-arrow" data-col="cefr"></span></th><th class="hv-cyan" onclick="wbSortTable(\'freq\')" style="padding:14px 16px;font-size:11px;font-weight:700;color:var(--text-soft);text-transform:uppercase;letter-spacing:.08em;font-family:\'Manrope\',sans-serif;text-align:left;cursor:pointer;user-select:none">Frequenza <span class="wb-sort-arrow" data-col="freq"></span></th><th style="padding:14px 16px;font-size:11px;font-weight:700;color:var(--text-soft);text-transform:uppercase;letter-spacing:.08em;font-family:\'Manrope\',sans-serif;text-align:right;user-select:none">Azioni</th></tr></thead><tbody id="wbTableBody" style="font-size:15px"></tbody></table></div>')+
            '</div>'+
          '</div>';
        renderWbTable(words);      }

      window.wbAddWordToBank = async function() {
        var inp = document.getElementById('wbAddWordInput');
        if (!inp || !inp.value.trim()) return;
        var word = inp.value.trim();
        var bankId = _wbState.currentBank;
        if (!bankId) return;
        var sb = window.sottotitoliSupabase;
        if (sb) {
          try {
            var r = await sb.auth.getSession();
            if (r.data?.session) {
              var userId = r.data.session.user.id;
              await sb.from('user_wordbank_words').insert({
                wordbank_id: _wbState.currentBankUUID || bankId, word: word, usage_count: 1
              });
              // Also feed Ripasso immediato (review_words)
              try {
                var isItalian = !!document.querySelector('#wbItInsideView[style*="display:block"], #wbItInsideView:not([style*="display:none"])');
                var lang = isItalian ? 'it' : (window.SOTTOTITOLI_STUDY_LANG || 'en');
                var clean = word.replace(/[^a-zA-Z0-9 '\-àèéìòùÀÈÉÌÒÙ]/g, '').trim();
                if (clean && clean.length >= 2) {
                  var norm = clean.toLowerCase();
                  var rwRes = await sb.from('review_words').select('id').eq('user_id', userId).eq('lemma', clean).maybeSingle();
                  if (rwRes.data) {
                    await sb.from('review_words').update({ personal_frequency: (rwRes.data.personal_frequency || 0) + 1 }).eq('id', rwRes.data.id);
                  } else {
                    await sb.from('review_words').insert({
                      user_id: userId, lemma: clean, normalized: norm, lang: lang,
                      pos: null, is_new: true, first_seen_at: new Date().toISOString(),
                      source_type: 'manual', review_state: 'new',
                      personal_frequency: 1
                    });
                  }
                }
              } catch(rwErr) { /* review_words may not exist */ }
            }
          } catch(e) {}
        }
        inp.value = '';
        // Reload the bank view, then reveal the new row with animations
        if (typeof openWordbankView === 'function') {
          var wbReloadP = openWordbankView(bankId);
          if (wbReloadP && wbReloadP.then) wbReloadP.then(function () { animateNewRow(word); });
        }
        showWbxToast('✓ ' + word + ' aggiunto');
      };

      // Reveal the just-added word's row in front of the user: scroll to it,
      // flash-highlight it, then stagger in its POS and CEFR cells.
      function animateNewRow(word) {
        var tbody = document.getElementById('wbTableBody');
        if (!tbody) return;
        var key = String(word || '').toLowerCase();
        var row = null;
        Array.prototype.slice.call(tbody.querySelectorAll('tr')).forEach(function (tr) {
          // The word lives in the first cell of each row
          var cell = tr.children[0];
          if (!row && cell && String(cell.textContent || '').trim().toLowerCase() === key) row = tr;
        });
        if (!row) return;
        try { row.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { row.scrollIntoView(); }
        row.classList.add('wb-added-row');
        var posTd = row.children[1];
        var cefrTd = row.children[2];
        if (posTd) posTd.classList.add('wb-reveal');
        setTimeout(function () { if (cefrTd) cefrTd.classList.add('wb-reveal'); }, 320);
        setTimeout(function () {
          row.classList.remove('wb-added-row');
          if (posTd) posTd.classList.remove('wb-reveal');
          if (cefrTd) cefrTd.classList.remove('wb-reveal');
        }, 2000);
      }

      function closeWordbankView() {
        var itTab = document.querySelector('[data-subtab="wb-overview-it"][aria-selected="true"]');
        var isItalian = !!itTab;
        var overviewId = isItalian ? 'wordbanksItOverview' : 'wordbanksOverview';
        var insideId = isItalian ? 'wbItInsideView' : 'wbInsideView';
        document.getElementById(overviewId).style.display = '';
        document.getElementById(insideId).style.display = 'none';
        document.getElementById(insideId).innerHTML = '';
        // Restore filter chips + search bar
        var searchBar = document.querySelector(isItalian ? '#sub-wb-overview-it .wb-search-bar' : '#sub-wb-overview .wb-search-bar');
        if (searchBar) searchBar.style.display = '';
        // Restore loading placeholder
        var enContent = document.getElementById('wbEnContent');
        if (enContent) enContent.style.display = '';
        _wbState.currentBank = null;
        _wbState.selectedRows = new Set();
      }

      // ── "Why these words?" toggle ──
      window.toggleWhyThisBank = function() {
        var section = document.getElementById('wbWhySection');
        if (!section) return;
        if (section.style.display === 'block') { section.style.display = 'none'; return; }
        var bankId = _wbState.currentBank;
        var whyTexts = {
          'review_due_now': '<strong>Collection rule:</strong> All words with <code>next_review_at ≤ now</code>. Sorted by overdue first, then lowest mastery. This is your core spaced-repetition queue — the most urgent words to review.',
          'saved_from_sessions': '<strong>Collection rule:</strong> Words you explicitly saved during live sessions (<code>saved_origin = session</code>). Manual save is a strong intent signal. Grouped into due now vs. not due yet.',
          'fragile_words': '<strong>Collection rule:</strong> Words with low mastery (&lt;40), repeated lapses (≥2), or recent "again"/"hard" outcomes. These need targeted reinforcement before they\'re forgotten.',
          'goal_next_step': '<strong>Recommendation logic:</strong> Words matched to your profile (role, domain, objectives). Each gets a <code>goal_relevance_score</code>. Only a small batch (5–12) is shown at a time. Every word says why it\'s relevant.',
          'build_from_known': '<strong>Recommendation logic:</strong> Lexical progression from words you already know — synonyms, register upgrades, collocations, derivations. Built from the <code>review_word_relations</code> graph.',
          'activate_recognized': '<strong>Recommendation logic:</strong> Words where recognition ≥ 50 but production/speech/typing &lt; 45. You understand them — now it\'s time to start using them actively.',
          'upcoming_useful_vocab': '<strong>Recommendation logic:</strong> Words tied to your declared short-term goal. Extracts keywords from your goal text and queries Datamuse topics to find vocabulary you will need imminently. Filtered to your CEFR level.',
          'upcoming_session_driven': '<strong>Recommendation logic:</strong> Analyzes your last 20 session titles for recurring word patterns. If you have been practicing a theme repeatedly, predicts you will need more vocabulary in that domain next.',
          'upcoming_roadmap': '<strong>Recommendation logic:</strong> Breaks your long-term goal into stages (interview, onboarding, daily work, etc.) and stages topic-specific vocabulary. Shows current-stage and next-stage words so you are always prepared for what is coming.'
        };
        section.innerHTML = (whyTexts[bankId] || '<strong>Collection rule:</strong> This bank uses custom criteria defined by you.') +
          '<div style="margin-top:6px;font-size:11px;color:var(--text-faint)">These rules determine which words appear here and in what order.</div>';
        section.style.display = 'block';
      };

      // Expose wordbank helpers globally (needed by onclick handlers)
      window.closeWordbankView = closeWordbankView;
      window.openWordbankView = openWordbankView;
      window.renameSession = renameSession;

      // ═══ RENDER: Trascrizioni (redesigned) ═══
      var _trFilter = 'all';
      var _trView = 'table';

      window.trFilter = function(btn, filter) {
        _trFilter = filter;
        var bar = document.getElementById('trFilterChips');
        if (bar) bar.querySelectorAll('.fchip').forEach(function(c){ c.classList.remove('active'); });
        btn.classList.add('active');
        renderTrascrizioni();
      };

      window.trSetView = function(btn, view) {
        _trView = view;
        document.querySelectorAll('#pnl-trascrizioni [data-tr-view]').forEach(function(c){ c.classList.remove('active'); });
        btn.classList.add('active');
        var tableEl = document.getElementById('trTableView');
        var drawerListEl = document.getElementById('trDrawerList');
        if (tableEl) tableEl.style.display = view === 'table' ? '' : 'none';
        if (drawerListEl) drawerListEl.style.display = view === 'drawer' ? '' : 'none';
        if (view === 'table') {
          // Close any open drawer
          if (typeof closeWbDrawer === 'function') closeWbDrawer();
        }
      };

      async function renderTrascrizioni() {
        // Delegates to the new renderer in pnl-trascrizioni inline script
        if (window.renderTrascrizioni) window.renderTrascrizioni();
      }
      // (renderTrascrizioni now handled by inline script in pnl-trascrizioni)

      window.trOpenSession = async function(sid, name) {
        // Open session detail in the word drawer
        var sb = window.sottotitoliSupabase;
        if (!sb) return;
        try {
          var { data: session } = await sb.from('sessions').select('*').eq('id', sid).single();
          if (!session) return;
          // Show drawer
          var drawer = document.getElementById('wbDrawer');
          var overlay = document.getElementById('wbDrawerOverlay');
          if (!drawer || !overlay) return;
          // Position to main-panel
          positionDrawer();
          overlay.classList.add('active');
          drawer.classList.add('active');
          // Hide unused section headers for session view
          drawer.querySelectorAll('.drawer-section').forEach(function(sec, i) {
            var h4 = sec.querySelector('h4');
            if (h4) {
              if (h4.textContent === 'Meaning') sec.style.display = '';
              else if (h4.textContent === 'Signals') sec.style.display = '';
              else sec.style.display = 'none';
            }
          });
          // Populate
          var mins = Math.round((session.duration_seconds||0)/60);
          var durStr = mins >= 60 ? Math.floor(mins/60)+'h '+(mins%60)+'m' : mins+'m';
          var dateStr = new Date(session.started_at).toLocaleDateString('it-IT', {day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'});
          var words = session.words_count || 0;
          var wpm = session.wpm ? Math.round(session.wpm) : '—';
          var lexDiv = session.lexical_diversity ? session.lexical_diversity.toFixed(2) : '—';
          document.getElementById('wbDrawerWord').textContent = session.name || ('Sessione ' + (sid||'').substring(0,8));
          document.getElementById('wbDrawerIPA').textContent = dateStr;
          document.getElementById('wbDrawerIPA').style.fontFamily = 'var(--font-ui)';
          document.getElementById('wbDrawerIPA').style.fontSize = '13px';
          document.getElementById('wbDrawerIPA').style.color = 'var(--text-soft)';
          document.getElementById('wbDrawerMeta').innerHTML =
            '<span class="badge" style="background:rgba(6,182,212,.15);color:var(--cyan);font-weight:600">'+durStr+'</span>'+
            '<span class="badge" style="background:rgba(6,182,212,.15);color:var(--cyan);font-weight:600">'+words+' parole</span>'+
            '<span class="badge" style="background:rgba(6,182,212,.15);color:var(--cyan);font-weight:600">'+(session.language_pair||'en')+'</span>';
          document.getElementById('wbDrawerMeaning').innerHTML =
            '<strong>WPM:</strong> '+wpm+' &middot; <strong>Lexical Diversity:</strong> '+lexDiv+'<br>'+
            (session.transcript_text ? '<em style="font-size:13px;color:var(--text-soft)">'+session.transcript_text.substring(0,300)+(session.transcript_text.length>300?'…':'')+'</em>' : '<span style="color:var(--text-faint)">Nessuna trascrizione disponibile.</span>');
          // Clean up unused sections
          document.getElementById('wbDrawerBanks').innerHTML = '';
          document.getElementById('wbDrawerAddBanks').innerHTML = '';
          // Signals → download + AI Reports
          document.getElementById('wbDrawerSignals').innerHTML =
            '<div style="display:flex;flex-direction:column;gap:8px">'+
            '<button class="btn-action smart-action" onclick="event.stopPropagation();trDownloadCSV(\''+sid+'\')" style="width:100%;justify-content:center"><i class="fa-solid fa-file-csv"></i> Scarica CSV</button>'+
            '<button class="btn-action custom-action" onclick="event.stopPropagation();trDownloadPDF(\''+sid+'\')" style="width:100%;justify-content:center"><i class="fa-solid fa-file-pdf"></i> Scarica PDF</button>'+
            '<button class="btn-action pinned-action" onclick="event.stopPropagation();document.querySelector(\'[data-panel=report-ai]\').dispatchEvent(new MouseEvent(\'click\',{bubbles:true}));closeWbDrawer()" style="width:100%;justify-content:center"><i class="fa-solid fa-robot"></i> AI Reports</button>'+
            '</div>';
        } catch(e) { console.warn('trOpenSession:', e); }
      };

      // (trDeleteSession now handled by inline script in pnl-trascrizioni)

      // (trToggleSelectAll + trUpdateBulkBar + trBulkDelete now handled by inline script)

      // ── Rename session ──
      window.trRenameSession = function(sid, btn) {
        var row = btn.closest('tr');
        var nameCell = row ? row.querySelector('.wb-word') : null;
        if (!nameCell) return;
        var oldName = nameCell.textContent.trim();
        var input = document.createElement('input');
        input.value = oldName;
        input.style.cssText = 'width:100%;border:none;outline:none;background:transparent;font:inherit;color:var(--text);padding:2px 4px;border-bottom:2px solid var(--cyan)';
        nameCell.textContent = '';
        nameCell.appendChild(input);
        input.focus(); input.select();
        var save = async function() {
          var newName = input.value.trim() || oldName;
          nameCell.textContent = newName;
          try {
            var sb = window.sottotitoliSupabase;
            if (sb) await sb.from('sessions').update({ name: newName }).eq('id', sid);
          } catch(e) {}
          // Reflect the new name on the dashboard "Ultime sessioni" feed right away
          if (window.syncSessionName) window.syncSessionName(sid, newName);
        };
        input.addEventListener('blur', save);
        input.addEventListener('keydown', function(e){ if (e.key === 'Enter') { input.blur(); } });
      };

      // ── Download helpers ──
      window.trDownloadCSV = async function(sid) {
        var sb = window.sottotitoliSupabase;
        if (!sb) return;
        var { data: session } = await sb.from('sessions').select('*').eq('id', sid).single();
        if (!session) return;
        var rows = [['Field','Value']];
        rows.push(['Name',session.name||'']);
        rows.push(['Date',session.started_at||'']);
        rows.push(['Duration (min)',Math.round((session.duration_seconds||0)/60)]);
        rows.push(['Words',session.words_count||0]);
        rows.push(['WPM',session.wpm||'']);
        rows.push(['Lexical Diversity',session.lexical_diversity||'']);
        rows.push(['Language',session.language_pair||'']);
        rows.push(['Transcript',(session.transcript_text||'').substring(0,1000)]);
        var csv = rows.map(function(r){ return r.map(function(c){ return '"'+(c+'').replace(/"/g,'""')+'"'; }).join(','); }).join('\n');
        var blob = new Blob([csv],{type:'text/csv;charset=utf-8'});
        var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'session-'+(sid||'').substring(0,8)+'.csv'; a.click();
      };
      window.trDownloadPDF = function(sid) {
        var toast = document.getElementById('authToast') || document.createElement('div');
        if (!toast.id) { toast.id = 'authToast'; toast.className = 'auth-toast'; document.body.appendChild(toast); }
        toast.textContent = '📄 Esportazione PDF in arrivo — nel frattempo usa CSV';
        toast.classList.add('show');
        setTimeout(function(){ toast.classList.remove('show'); }, 4000);
      };

      window.sortWbWords = sortWbWords;
      window.filterWbWords = filterWbWords;
      window.addWordToCurrentBank = addWordToCurrentBank;
      window.openWbDrawer = openWbDrawer;
      window.closeWbDrawer = closeWbDrawer;
      window.filterWordbanks = filterWordbanks;
      window.filterWbType = filterWbType;
      window.wbBulkMarkKnown = wbBulkMarkKnown;
      window.wbBulkRemove = wbBulkRemove;
      window.wbClearSelection = wbClearSelection;
      window.wbToggleAll = wbToggleAll;
      window.wbToggleRow = wbToggleRow;
      window.wbUpdateBulkBar = wbUpdateBulkBar;
      window.newWordbank = window.newWordbank; // already exposed

      var _wbSort = {col:'word',dir:'asc'};

      function renderWbTable(words) {
        var tbody = document.getElementById('wbTableBody');
        if (!tbody) return;
        // Apply current sort
        var sorted = words.slice();
        var col = _wbSort.col, dir = _wbSort.dir;
        sorted.sort(function(a,b){
          var va, vb;
          if (col==='word') { va=(a.word||a.lemma||'').toLowerCase(); vb=(b.word||b.lemma||'').toLowerCase(); }
          else if (col==='pos') { va=(a.pos||a.part_of_speech||'').toLowerCase(); vb=(b.pos||b.part_of_speech||'').toLowerCase(); }
          else if (col==='cefr') { va=(a.cefr||a.cefr_level||a.level||'').toUpperCase(); vb=(b.cefr||b.cefr_level||b.level||'').toUpperCase(); }
          else if (col==='freq') { va=a.usage_count||a.frequency||a.reps||0; vb=b.usage_count||b.frequency||b.reps||0; }
          else { va=0; vb=0; }
          if (va<vb) return dir==='asc'?-1:1;
          if (va>vb) return dir==='asc'?1:-1;
          return 0;
        });

        var cefrColors = {C2:'#8b5cf6',C1:'#d97706',B2:'#059669',B1:'#0d9488',A2:'#0891b2',A1:'#2563eb'};
        var html = '';
        sorted.forEach(function(w) {
          var posVal = w.pos || w.part_of_speech || '—';
          var cefrVal = (w.cefr || w.cefr_level || w.level || '').toUpperCase();
          var cefrColor = cefrColors[cefrVal] || 'var(--text-soft)';
          var cefrBadge = cefrVal ? '<span style="display:inline-block;padding:2px 8px;border-radius:4px;background:'+cefrColor+'15;color:'+cefrColor+';border:1px solid '+cefrColor+'30;font-size:11px;font-weight:700;font-family:\'Manrope\',sans-serif">'+cefrVal+'</span>' : '<span style="font-size:11px;color:var(--text-faint)">—</span>';
          var wordText = w.word || w.lemma || w.normalized || '—';
          var uses = w.usage_count || w.frequency || w.reps || 0;
          var wid = w.id || '';
          var escapedWord = wordText.replace(/'/g,"\\'").replace(/"/g,'&quot;');
          html += '<tr class="hv-bg-cyan-soft" data-wid="'+wid+'" style="border-bottom:1px solid var(--line);transition:all .2s">'+
            '<td style="padding:14px 16px"><span class="hv-cyan" style="font-size:18px;font-weight:700;color:var(--text);cursor:pointer" onclick="event.stopPropagation();openWbDrawer(\''+wid+'\')">'+wordText+'</span></td>'+
            '<td style="padding:14px 16px;font-size:13px;color:var(--text-soft);text-transform:capitalize">'+posVal+'</td>'+
            '<td style="padding:14px 16px">'+cefrBadge+'</td>'+
            '<td style="padding:14px 16px;font-size:13px;font-weight:600;color:var(--text-soft);font-variant-numeric:tabular-nums">'+(uses > 0 ? uses+'×' : '—')+'</td>'+
            '<td style="padding:14px 16px;text-align:right;white-space:nowrap">'+
              '<button class="hv-cyan" onclick="event.stopPropagation();openWbDrawer(\''+wid+'\')" style="background:none;border:none;color:var(--text-soft);cursor:pointer;padding:4px 6px;opacity:0;transition:opacity .15s,color .15s" title="Details"><span class="material-symbols-outlined" style="font-size:18px">info</span></button>'+
              '<button class="hv-red" onclick="event.stopPropagation();wbDeleteWord(\''+wid+'\',\''+escapedWord+'\')" style="background:none;border:none;color:var(--text-soft);cursor:pointer;padding:4px 6px;opacity:0;transition:opacity .15s,color .15s" title="Remove"><span class="material-symbols-outlined" style="font-size:18px">delete</span></button>'+
            '</td></tr>';
        });
        // Sort arrow indicators
        var arrows = {word:'',pos:'',cefr:'',freq:''};
        arrows[col] = dir==='asc'?' ▲':' ▼';
        // Show action buttons on row hover via CSS
        tbody.innerHTML = (html || '<tr><td colspan="5" style="padding:40px;text-align:center;color:var(--text-faint)">' + (I18n && I18n.t ? I18n.t('wordbank_no_words') : 'Nessuna parola ancora. Inizia una sessione o aggiungi parole.') + '</td></tr>') +
          '<style>#wbTableBody tr:hover td button{opacity:1!important}' +
            '@keyframes wbRowAdded{0%{background:rgba(6,182,212,.18)}100%{background:transparent}}' +
            '#wbTableBody tr.wb-added-row{animation:wbRowAdded 1.6s ease-out forwards}' +
            '@keyframes wbCellReveal{from{opacity:0;transform:translateY(8px) scale(.92)}to{opacity:1;transform:none}}' +
            '#wbTableBody td.wb-reveal{opacity:0;animation:wbCellReveal .55s cubic-bezier(.22,1,.36,1) forwards}' +
          '</style>';
        // Update sort arrows in headers
        setTimeout(function(){
          document.querySelectorAll('.wb-sort-arrow').forEach(function(s){ s.textContent = ''; });
          var active = document.querySelector('.wb-sort-arrow[data-col="'+col+'"]');
          if(active) active.textContent = dir==='asc'?' ▲':' ▼';
        }, 10);
      }

      window.wbSortTable = function(col) {
        if (_wbSort.col === col) { _wbSort.dir = _wbSort.dir === 'asc' ? 'desc' : 'asc'; }
        else { _wbSort.col = col; _wbSort.dir = 'asc'; }
        renderWbTable(_wbState.currentWords);
      };

      // ── Table row selection ──
      // ── Unified checkbox change handler (fixes direct checkbox clicks) ──
      window.wbCheckboxChanged = function(cb) {
        var tr = cb.closest('tr');
        var wid = tr ? tr.getAttribute('data-wid') : null;
        if (tr) tr.classList.toggle('selected', cb.checked);
        if (cb.checked && wid) _wbState.selectedRows.add(wid);
        else if (wid) _wbState.selectedRows.delete(wid);
        wbUpdateBulkBar();
      };

      function wbToggleRow(tr) {
        var cb = tr.querySelector('input[type="checkbox"]');
        if (!cb) return;
        // Toggle the checkbox — programmatic change, so manually update state
        cb.checked = !cb.checked;
        var wid = tr.getAttribute('data-wid');
        tr.classList.toggle('selected', cb.checked);
        if (cb.checked && wid) _wbState.selectedRows.add(wid);
        else if (wid) _wbState.selectedRows.delete(wid);
        wbUpdateBulkBar();
      }

      function wbToggleAll(masterCb) {
        var checked = masterCb.checked;
        document.querySelectorAll('#wbTableBody input[type="checkbox"]').forEach(function(cb) {
          cb.checked = checked;
          var tr = cb.closest('tr');
          if (tr) tr.classList.toggle('selected', checked);
          var wid = tr ? tr.getAttribute('data-wid') : null;
          if (checked && wid) _wbState.selectedRows.add(wid);
          else if (wid) _wbState.selectedRows.delete(wid);
        });
        wbUpdateBulkBar();
      }

      function wbUpdateBulkBar() {
        var bar = document.getElementById('wbBulkBar');
        var count = document.getElementById('wbBulkCount');
        if (!bar || !count) return;
        var n = _wbState.selectedRows.size;
        if (n > 0) {
          bar.style.display = 'flex';
          count.textContent = n + ' selected';
        } else {
          bar.style.display = 'none';
        }
      }

      function wbClearSelection() {
        _wbState.selectedRows = new Set();
        document.querySelectorAll('#wbTableBody input[type="checkbox"]').forEach(function(cb){cb.checked=false;cb.closest('tr').classList.remove('selected')});
        wbUpdateBulkBar();
      }

      async function wbBulkMarkKnown() {
        var ids = Array.from(_wbState.selectedRows);
        for (var i=0;i<ids.length;i++) { await SottotitoliData.updateWordStatus(ids[i], 'known'); }
        SottotitoliData.cacheClear();
        wbClearSelection();
        openWordbankView(_wbState.currentBank);
      }

      // ── Single word delete (instant, no confirm) ──
      window.wbDeleteWord = async function(wordId, wordText) {
        var bankKey = _wbState.currentBank;
        var bankUUID = _wbState.currentBankUUID;
        var bankType = _wbState.currentBankType || '';
        if (!wordId) return;
        var row = document.querySelector('#wbTableBody tr[data-wid="' + wordId + '"]');
        if (row) { row.style.opacity = '0'; row.style.transform = 'translateX(20px)'; row.style.transition = 'all .2s'; }

        var result = false;
        var sb = window.sottotitoliSupabase;

        if (bankType === 'pinned' && (bankKey === 'review_due_now' || bankKey === 'fragile_words')) {
          // These query review_words directly — dismiss by marking not new + dismissed
          try {
            if (sb) {
              await sb.from('review_words').update({ is_new: false, dismissed_at: new Date().toISOString() }).eq('id', wordId);
              result = true;
            }
          } catch(e) { console.warn('review_words dismiss:', e); }
        } else if (bankType === 'pinned' && bankKey === 'saved_from_sessions') {
          // Saved from sessions — delete from user_wordbank_words by UUID
          if (bankUUID) {
            try {
              result = await SottotitoliData.bulkRemoveFromBank(bankUUID, [wordId]);
            } catch(e) { console.warn('bulkRemoveFromBank:', e); }
            if (!result && sb) {
              try {
                var { error } = await sb.from('user_wordbank_words').delete().eq('wordbank_id', bankUUID).eq('id', wordId);
                if (!error) result = true;
              } catch(e2) {}
            }
          }
        } else if (bankType === 'smart') {
          // Smart banks — mark the word inactive in review_bank_words
          try {
            if (sb) {
              await sb.from('review_bank_words').update({ status: 'dismissed' }).eq('bank_key', bankKey).eq('word_id', wordId);
              result = true;
            }
          } catch(e) { console.warn('smart bank dismiss:', e); }
        } else if (bankType === 'custom') {
          // Custom banks — delete from user_wordbank_words by UUID (same as bankKey for custom banks)
          var deleteUUID = bankUUID || bankKey;
          if (deleteUUID) {
            try {
              result = await SottotitoliData.bulkRemoveFromBank(deleteUUID, [wordId]);
            } catch(e) { console.warn('bulkRemoveFromBank:', e); }
            if (!result && sb) {
              try {
                var { error } = await sb.from('user_wordbank_words').delete().eq('wordbank_id', deleteUUID).eq('id', wordId);
                if (!error) result = true;
              } catch(e2) {}
            }
          }
        }

        if (result) {
          SottotitoliData.cacheClear();
          // Update card count on overview
          var deleteBankId = bankType === 'custom' ? (bankUUID || bankKey) : (bankUUID || bankKey);
          var card = document.querySelector('#wordbanksOverview .wb-card[data-bank-id="' + deleteBankId + '"]');
          if (card) {
            var countEl = card.querySelector('.wb-card-count');
            if (countEl) {
              var cur = parseInt(countEl.textContent) || 0;
              countEl.textContent = Math.max(0, cur - 1);
            }
          }
          if (row) setTimeout(function(){ row.remove(); }, 200);
        } else {
          if (row) { row.style.opacity = '1'; row.style.transform = ''; }
          console.warn('Delete failed for wordId:', wordId, 'bankKey:', bankKey, 'type:', bankType, 'UUID:', bankUUID);
        }
      };

      // ── Populate the "Move to" dropdown with custom banks ──
      window.wbPopulateMoveDropdown = async function() {
        var sel = document.getElementById('wbBulkMoveTarget');
        if (!sel || sel.getAttribute('data-loaded')) return;
        var isItalian = !!document.querySelector('[data-subtab="wb-overview-it"][aria-selected="true"]');
        var lang = isItalian ? 'it' : (window.SOTTOTITOLI_STUDY_LANG || 'en');
        // Start with default options
        sel.innerHTML = '<option value="">Move to…</option>';
        // Add localStorage banks
        try {
          var localBanks = JSON.parse(localStorage.getItem('sottotitoli_wb_custom_' + lang) || '[]');
          localBanks.forEach(function(b){
            var opt = document.createElement('option');
            opt.value = b.id;
            opt.textContent = '📦 ' + b.name;
            sel.appendChild(opt);
          });
        } catch(e) {}
        // Add Supabase custom banks
        var sb = window.sottotitoliSupabase;
        if (sb) {
          try {
            var r = await sb.auth.getSession();
            if (r.data?.session) {
              var userId = r.data.session.user.id;
              var { data: banks } = await sb.from('user_wordbanks')
                .select('id,name').eq('user_id', userId).eq('lang', lang).order('name');
              if (banks && banks.length) {
                var existing = new Set();
                Array.from(sel.options).forEach(function(o){ existing.add(o.value); });
                banks.forEach(function(b){
                  if (!existing.has(b.id)) {
                    var opt = document.createElement('option');
                    opt.value = b.id;
                    opt.textContent = '📦 ' + b.name;
                    sel.appendChild(opt);
                  }
                });
              }
            }
          } catch(e) { /* silently skip */ }
        }
        sel.setAttribute('data-loaded', '1');
      };

      // ── Move selected words to chosen bank ──
      window.wbBulkMoveTo = async function(targetBankId) {
        if (!targetBankId) return;
        var ids = Array.from(_wbState.selectedRows).filter(function(id) { return id && id !== 'undefined' && id !== 'null'; });
        if (!ids.length) return;
        var bankType = _wbState.currentBankType || '';
        var sourceBankName = _wbState.currentBank || '';
        // Build word list from current visible words (matching selected ids)
        var words = _wbState.currentWords || [];
        var selectedWords = words.filter(function(w){ return ids.indexOf(String(w.id)) >= 0; });
        if (!selectedWords.length) return;
        var done = 0, failed = 0;
        var sb = window.sottotitoliSupabase;
        for (var i = 0; i < selectedWords.length; i++) {
          var w = selectedWords[i];
          var word = w.word || w.lemma || '';
          var pos = w.pos || null;
          if (!word) continue;
          try {
            var result = await SottotitoliData.addWordToBank(targetBankId, word, pos);
            if (result) done++; else failed++;
          } catch(e) { failed++; }
        }
        SottotitoliData.cacheClear();
        // Reset dropdown
        var sel = document.getElementById('wbBulkMoveTarget');
        if (sel) { sel.value = ''; sel.removeAttribute('data-loaded'); }
        showWbxToast('✔ ' + done + ' word' + (done !== 1 ? 's' : '') + ' moved' + (failed ? ', ' + failed + ' failed' : ''));
      };

      async function wbBulkRemove() {
        var bankKey = _wbState.currentBank;
        var bankUUID = _wbState.currentBankUUID;
        var bankType = _wbState.currentBankType || '';
        var ids = Array.from(_wbState.selectedRows).filter(function(id) { return id && id !== 'undefined' && id !== 'null'; });
        if (!ids.length) return;
        appConfirm('Rimuovere ' + ids.length + ' parola/e selezionata/e da questa banca? Questa azione non può essere annullata.', async function(){

        var sb = window.sottotitoliSupabase;

        if (bankType === 'pinned' && (bankKey === 'review_due_now' || bankKey === 'fragile_words')) {
          // Dismiss from review_words
          if (sb) {
            try {
              await sb.from('review_words').update({ is_new: false, dismissed_at: new Date().toISOString() }).in('id', ids);
            } catch(e) { console.warn('bulk dismiss review_words:', e); }
          }
        } else if (bankType === 'pinned' && bankKey === 'saved_from_sessions') {
          // Delete from user_wordbank_words by UUID
          if (bankUUID) {
            await SottotitoliData.bulkRemoveFromBank(bankUUID, ids);
          }
        } else if (bankType === 'smart') {
          // Mark dismissed in review_bank_words
          if (sb) {
            try {
              await sb.from('review_bank_words').update({ status: 'dismissed' }).eq('bank_key', bankKey).in('word_id', ids);
            } catch(e) { console.warn('bulk dismiss smart bank:', e); }
          }
        } else if (bankType === 'custom') {
          // Delete from user_wordbank_words by UUID
          var deleteUUID = bankUUID || bankKey;
          if (deleteUUID) {
            await SottotitoliData.bulkRemoveFromBank(deleteUUID, ids);
          }
        }

        SottotitoliData.cacheClear();
        // Update card count on overview
        var bulkBankId = bankType === 'custom' ? (bankUUID || bankKey) : (bankUUID || bankKey);
        var card = document.querySelector('#wordbanksOverview .wb-card[data-bank-id="' + bulkBankId + '"]');
        if (card) {
          var countEl = card.querySelector('.wb-card-count');
          if (countEl) {
            var cur = parseInt(countEl.textContent) || 0;
            countEl.textContent = Math.max(0, cur - ids.length);
          }
        }
        wbClearSelection();
        openWordbankView(_wbState.currentBank);
        });
      }

      // ═══ TABLE SORTING ═══
      var _sortState = {};   // { tbodyId: { col: key, dir: 0|1|2 } }  0=orig 1=desc(high→low) 2=asc(low→high)
      var _origRows = {};    // { tbodyId: [rowElement, ...] }

      function wbSortTable(tbodyId, colKey, thEl) {
        var tbody = document.getElementById(tbodyId);
        if (!tbody) return;

        // Init state
        if (!_sortState[tbodyId]) _sortState[tbodyId] = { col: null, dir: 0 };
        var st = _sortState[tbodyId];

        // Advance: same col → cycle 0→1→2→0; different col → start at 1 (desc)
        if (st.col === colKey) { st.dir = (st.dir + 1) % 3; }
        else { st.col = colKey; st.dir = 1; }

        // Save original order once
        if (!_origRows[tbodyId]) {
          _origRows[tbodyId] = Array.from(tbody.querySelectorAll('tr'));
        }

        var rows = Array.from(tbody.querySelectorAll('tr'));

        // Clear all header indicators
        var table = tbody.closest('table');
        if (table) {
          table.querySelectorAll('th.sortable').forEach(function(th){ th.classList.remove('sort-asc','sort-desc'); });
        }

        // State 0 = restore original
        if (st.dir === 0) {
          if (_origRows[tbodyId]) {
            _origRows[tbodyId].forEach(function(r){ tbody.appendChild(r); });
          }
          return;
        }

        // Set indicator
        if (thEl) { thEl.classList.add(st.dir === 1 ? 'sort-desc' : 'sort-asc'); }

        // Sort
        rows.sort(function(a, b){
          var va = _wbSortVal(a, colKey, tbodyId);
          var vb = _wbSortVal(b, colKey, tbodyId);
          var cmp = _wbCompare(va, vb);
          return st.dir === 1 ? -cmp : cmp; // 1=desc
        });
        rows.forEach(function(r){ tbody.appendChild(r); });
      }

      function _wbSortVal(row, colKey, tbodyId) {
        var cells = row.cells;
        switch(colKey) {
          case 'word':  return (row.querySelector('.wb-word')?.textContent || cells[1]?.textContent || '').trim().toLowerCase();
          case 'cefr':  return _cefrRank(row.querySelector('.badge-cefr')?.textContent || cells[3]?.textContent || '');
          case 'pos':   return (row.querySelector('.badge-pos')?.textContent || cells[2]?.textContent || '').trim().toLowerCase();
          case 'uses':  return parseInt(cells[4]?.textContent) || 0;
          // Trascrizioni table columns
          case 'name':  return (cells[2]?.textContent || '').trim().toLowerCase();
          case 'date':  return _parseReviewDate(cells[3]?.textContent || '');
          case 'duration': return _parseDuration(cells[4]?.textContent || '');
          case 'language': return (cells[5]?.textContent || '').trim().toLowerCase();
          case 'status': return (cells[6]?.textContent || '').trim().toLowerCase();
          default: return '';
        }
      }

      function _parseDuration(txt) {
        // Parse "1h 23m" or "45m" or "2m" to seconds
        if (!txt || txt === '—') return 0;
        var match = txt.match(/(?:(\d+)h\s*)?(?:(\d+)m)?/);
        if (!match) return 0;
        var h = parseInt(match[1]) || 0;
        var m = parseInt(match[2]) || 0;
        return h * 3600 + m * 60;
      }

      function _cefrRank(lvl) {
        var r = {'A1':1,'A2':2,'B1':3,'B2':4,'C1':5,'C2':6};
        return r[(lvl||'').trim()] || 0;
      }

      function _parseReviewDate(txt) {
        if (!txt || txt === 'Mai' || txt === '—') return 0;
        var d = new Date(txt);
        return isNaN(d.getTime()) ? 0 : d.getTime();
      }

      function _wbCompare(a, b) {
        if (typeof a === 'number' && typeof b === 'number') return a - b;
        a = String(a); b = String(b);
        if (a < b) return -1;
        if (a > b) return 1;
        return 0;
      }

      // Event delegation for sortable headers
      document.addEventListener('click', function(e){
        var th = e.target.closest('th.sortable');
        if (!th) return;
        var tbody = th.closest('table')?.querySelector('tbody');
        if (!tbody) return;
        var colKey = th.getAttribute('data-sort');
        wbSortTable(tbody.id, colKey, th);
      });

      // Reset sort state when tables are repopulated
      var _origRenderWbTable = renderWbTable;
      renderWbTable = function(words) {
        _sortState['wbTableBody'] = null;
        _origRows['wbTableBody'] = null;
        return _origRenderWbTable(words);
      };

      // ── Word detail drawer ──
      function positionDrawer() {
        var drawer = document.getElementById('wbDrawer');
        var overlay = document.getElementById('wbDrawerOverlay');
        var mp = document.querySelector('.main-panel');
        if (!drawer || !mp) return;
        var r = mp.getBoundingClientRect();
        drawer.style.top = r.top + 'px';
        drawer.style.right = (window.innerWidth - r.right) + 'px';
        drawer.style.bottom = (window.innerHeight - r.bottom) + 'px';
        drawer.style.width = Math.min(440, r.width) + 'px';
        if (overlay) {
          overlay.style.top = r.top + 'px';
          overlay.style.left = r.left + 'px';
          overlay.style.width = r.width + 'px';
          overlay.style.height = r.height + 'px';
        }
      }
      var _drawerResizeHandler = null;
      async function openWbDrawer(wordId) {
        var w = _wbState.currentWords.find(function(x){return x.id === wordId;});
        if (!w) return;
        // Position drawer + overlay to match main-panel bounds
        positionDrawer();
        if (!_drawerResizeHandler) {
          _drawerResizeHandler = function() { positionDrawer(); };
          window.addEventListener('resize', _drawerResizeHandler);
        }
        document.getElementById('wbDrawerOverlay').classList.add('active');
        document.getElementById('wbDrawer').classList.add('active');
        // Restore all drawer sections (may have been hidden by session view)
        document.querySelectorAll('#wbDrawer .drawer-section').forEach(function(sec){ sec.style.display = ''; });
        var wordText = w.word || w.lemma || w.normalized || '—';
        document.getElementById('wbDrawerWord').textContent = wordText;
        document.getElementById('wbDrawerIPA').textContent = '';

        // ── Meta: POS + CEFR ──
        var metaHtml = '';
        var posVal = w.pos || w.part_of_speech || '';
        var cefrVal = w.cefr || w.cefr_level || w.level || '';
        if (cefrVal) metaHtml += '<span class="badge badge-cefr">'+cefrVal+'</span>';
        if (posVal) metaHtml += '<span class="badge badge-pos">'+posVal+'</span>';
        document.getElementById('wbDrawerMeta').innerHTML = metaHtml || '<span style="font-size:11px;color:var(--text-faint)">—</span>';

        // ── Definition + IPA — chain: stored → dictionary-proxy (EN+IT) →
        //    local NGSL (EN) → direct Free Dictionary (EN) ──
        var definition = w.definition || w.translation_primary || '';
        var meaningEl = document.getElementById('wbDrawerMeaning');
        var ipaEl = document.getElementById('wbDrawerIPA');
        var metaEl = document.getElementById('wbDrawerMeta');
        function wbDrawerSetIpa(str) { if (str) ipaEl.textContent = '/' + String(str).replace(/^\/|\/$/g, '') + '/'; }
        function wbDrawerSetPos(posLabel) {
          if (!posLabel || posVal) return;
          posVal = posLabel;
          metaHtml += '<span class="badge badge-pos">' + posLabel + '</span>';
          if (metaEl) metaEl.innerHTML = metaHtml;
        }
        if (wordText !== '—') {
          meaningEl.textContent = definition || 'Caricamento…';
          // 1. dictionary-proxy (works for English AND Italian)
          try {
            var resp = await fetch('https://qzqmuegbpmvqrjrlfbgk.supabase.co/functions/v1/dictionary-proxy?word=' + encodeURIComponent(wordText.toLowerCase()));
            if (resp.ok) {
              var defData = await resp.json();
              var entry = Array.isArray(defData) ? defData[0] : (defData && defData.definition !== undefined ? defData : null);
              if (entry && !entry.notFound) {
                // IPA — normalized { ipa } or Free-Dictionary { phonetic / phonetics }
                var ipa = entry.ipa || '';
                if (!ipa && typeof entry.phonetic === 'string') ipa = entry.phonetic;
                else if (!ipa && entry.phonetic && entry.phonetic.text) ipa = entry.phonetic.text;
                else if (!ipa && entry.phonetics && entry.phonetics.length) {
                  var ph = entry.phonetics.find(function(p){ return p.text; });
                  if (ph) ipa = ph.text;
                }
                wbDrawerSetIpa(ipa);
                // Definition — normalized { definition } or meanings[]
                var newDef = '';
                if (entry.definition) newDef = entry.definition;
                else if (entry.meanings && entry.meanings[0]) {
                  var m = entry.meanings[0];
                  if (m.definitions && m.definitions[0]) newDef = m.definitions[0].definition || '';
                  if (!posVal && m.partOfSpeech) wbDrawerSetPos(m.partOfSpeech.toUpperCase());
                }
                if (newDef) definition = newDef;
              }
            }
          } catch(e) { /* API unavailable */ }
          // 2. local NGSL (English, offline, 2800 most frequent words)
          if (!definition && window.EN_NGSL) {
            var ng = window.EN_NGSL[wordText.toLowerCase()];
            if (ng && ng[3]) {
              var ngPosMap = { v:'verb', n:'noun', adj:'adjective', adv:'adverb' };
              definition = ng[3];
              wbDrawerSetIpa(ng[2]);
              if (ng[1] && ngPosMap[ng[1]]) wbDrawerSetPos(ngPosMap[ng[1]]);
            }
          }
          // 3. direct Free Dictionary (broader EN coverage, e.g. 'apple')
          if (!definition) {
            try {
              var fdResp = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(wordText.toLowerCase()));
              if (fdResp.ok) {
                var fdData = await fdResp.json();
                if (fdData && fdData[0]) {
                  var fd = fdData[0];
                  wbDrawerSetIpa(typeof fd.phonetic === 'string' ? fd.phonetic : ((fd.phonetics || []).find(function(p){ return p.text; }) || {}).text);
                  var fm = fd.meanings && fd.meanings[0];
                  if (fm && fm.definitions && fm.definitions[0]) definition = fm.definitions[0].definition || '';
                  if (fm && !posVal && fm.partOfSpeech) wbDrawerSetPos(fm.partOfSpeech.toUpperCase());
                }
              }
            } catch(e) { /* API unavailable */ }
          }
        }
        meaningEl.textContent = definition || (I18n && I18n.t ? I18n.t('word_definition_unavailable') : 'Nessuna definizione trovata per questa parola.');

        // ── Bank membership (real: which of the user's banks contain this word) ──
        var lang = window.SOTTOTITOLI_STUDY_LANG || 'en';
        var banks = await SottotitoliData.getWordbanks(lang);
        var membershipHTML = '';
        var memberBankIds = [];
        var bankIds = (banks || []).map(function (b) { return b.id; });
        try {
          var sb = window.sottotitoliSupabase;
          if (sb && bankIds.length) {
            var { data: membershipRows } = await sb.from('user_wordbank_words')
              .select('wordbank_id')
              .in('wordbank_id', bankIds)
              .eq('word', wordText);
            (membershipRows || []).forEach(function (mr) {
              if (memberBankIds.indexOf(mr.wordbank_id) === -1) memberBankIds.push(mr.wordbank_id);
            });
          }
        } catch (e) {}
        // Fallback when the query can't run (offline): at least flag the current bank
        if (!memberBankIds.length && banks && banks.length) {
          banks.forEach(function (b) {
            if (_wbState.currentBankUUID === b.id || _wbState.currentBank === b.id) memberBankIds.push(b.id);
          });
        }
        if (banks && banks.length) {
          banks.forEach(function (b) {
            if (memberBankIds.indexOf(b.id) !== -1) membershipHTML += '<span class="membership-chip">' + b.name + '</span>';
          });
        }
        document.getElementById('wbDrawerBanks').innerHTML = membershipHTML || '<span style="font-size:13px;color:var(--text-faint)">Non presente in nessuna word bank.</span>';

        // ── Add to other banks (skip banks the word is already in) ──
        var addBankHTML = '';
        if (banks && banks.length) {
          for (var j = 0; j < banks.length; j++) {
            var b = banks[j];
            if (memberBankIds.indexOf(b.id) !== -1) continue; // skip banks that already contain it
            addBankHTML += '<span class="membership-chip add-chip" onclick="event.stopPropagation();wbAddWordToOtherBank(\''+wordId+'\',\''+b.id+'\',\''+b.name.replace(/'/g,"\\'")+'\',this)" title="Add to '+b.name+'">+ '+b.name+'</span>';
          }
        }
        if (!addBankHTML) addBankHTML = '<span style="font-size:11px;color:var(--text-faint)">Create another bank first</span>';
        document.getElementById('wbDrawerAddBanks').innerHTML = addBankHTML;

        // ── Signals ──
        var uses = w.usage_count || w.frequency || w.reps || 0;
        document.getElementById('wbDrawerSignals').innerHTML =
          '<div class="drawer-signal">Uses <strong>'+(uses > 0 ? uses+'×' : '—')+'</strong></div>'+
          '<div class="drawer-signal">CEFR <strong>'+(cefrVal || '—')+'</strong></div>';
      }

      // ── Add word to another bank from drawer ──
      window.wbAddWordToOtherBank = async function(wordId, bankId, bankName, chipEl) {
        var w = _wbState.currentWords.find(function(x){return x.id === wordId;});
        if (!w) return;
        var word = w.word || w.lemma || '';
        var pos = w.pos || w.part_of_speech || null;
        if (!word || !bankId) return;
        try {
          var result = await SottotitoliData.addWordToBank(bankId, word, pos);
          if (!result) {
            console.warn('addWordToBank returned null for word:', word, 'bank:', bankId);
            if (chipEl) { chipEl.textContent = '⚠ Riprova'; chipEl.style.color = 'var(--amber)'; }
            return;
          }
          SottotitoliData.cacheClear();
          // Update the card count on the overview
          var card = document.querySelector('#wordbanksOverview .wb-card[data-bank-id="' + bankId + '"]');
          if (card) {
            var countEl = card.querySelector('.wb-card-count');
            if (countEl) {
              var cur = parseInt(countEl.textContent) || 0;
              countEl.textContent = cur + 1;
            }
          }
          if (chipEl) {
            chipEl.textContent = '✓ ' + bankName;
            chipEl.classList.remove('add-chip');
            chipEl.style.background = 'var(--teal-4)';
            chipEl.style.color = 'var(--teal)';
            chipEl.style.border = '1px solid var(--teal)';
            chipEl.onclick = null;
          }
        } catch(e) { console.warn('add to bank:', e); if (chipEl) { chipEl.textContent = '⚠ Errore'; } }
      };

      function closeWbDrawer() {
        document.getElementById('wbDrawerOverlay').classList.remove('active');
        document.getElementById('wbDrawer').classList.remove('active');
      }

      // ── Search / filter ──
      function filterWordbanks() {
        var q = (document.getElementById('wbSearchInput')?.value || '').toLowerCase();
        document.querySelectorAll('#wordbanksOverview .wb-card[data-bank-id]').forEach(function(card) {
          var article = card.closest('article');
          if (article) {
            article.style.display = (article.textContent||'').toLowerCase().includes(q) ? '' : 'none';
          }
        });
      }

      function filterWbType(btn, type) {
        btn.parentElement.querySelectorAll('.fchip').forEach(function(c){c.classList.remove('active')});
        btn.classList.add('active');
        document.querySelectorAll('#wordbanksOverview .wb-section').forEach(function(s) {
          if (type === 'all') { s.style.display = ''; return; }
          s.style.display = s.getAttribute('data-section') === type ? '' : 'none';
        });
      }

      // ── Italian Collection filters ──
      // ── Legacy Italian filter functions (Italian subtab now uses inline rendering like English) ──
      function filterWbTypeIt(btn, type) {
        // No-op: Italian subtab no longer uses filter chips. Inline script handles rendering.
      }

      function filterWordbanksIt() {
        // No-op: Italian subtab no longer uses search input. Inline script handles rendering.
      }
      // Expose to global scope for onclick handlers
      window.filterWbTypeIt = filterWbTypeIt;
      window.filterWordbanksIt = filterWordbanksIt;

      function filterWbWords(btn, status) {
        btn.parentElement.querySelectorAll('.fchip').forEach(function(c){c.classList.remove('active')});
        btn.classList.add('active');
        if (status === 'all') { renderWbTable(_wbState.currentWords); return; }
        var filtered = _wbState.currentWords.filter(function(w){return w.status === status;});
        renderWbTable(filtered);
      }

      function sortWbWords(order) {
        var words = _wbState.currentWords.slice();
        if (order === 'alphabetical') words.sort(function(a,b){return (a.word||'').localeCompare(b.word||'')});
        else if (order === 'usage') words.sort(function(a,b){return (b.usage_count||0)-(a.usage_count||0)});
        renderWbTable(words);
      }

      function addWordToCurrentBank() {
        appPrompt('Parola da aggiungere alla banca:', function(word){
          if (!word || !word.trim()) return;
          if (!_wbState.currentBank) return;
          window.addWordToBank(_wbState.currentBank);
          // Quick inline: set the input if it exists
          var inp = document.getElementById('wbAddWord-'+_wbState.currentBank);
          if (inp) { inp.value = word.trim(); window.addWordToBank(_wbState.currentBank); }
        }, 'Aggiungi parola', '➕', 'Es. ciao');
      }

      // ═══ Add word to bank (legacy, kept for compatibility) ───
      window.addWordToBank = async function(wbId) {
        var inp = document.getElementById('wbAddWord-'+wbId);
        if (!inp) return;
        var word = inp.value.trim();
        if (!word) return;
        try {
          var uid = await SottotitoliData.getUserId();
          if (!uid || !window.sottotitoliSupabase) return;
          var { error } = await window.sottotitoliSupabase.from('user_wordbank_words').insert({ wordbank_id: wbId, word: word, usage_count: 0 });
          if (!error) { inp.value = ''; SottotitoliData.cacheClear(); renderWordbanks(); if (_wbState.currentBank) openWordbankView(_wbState.currentBank); }
        } catch(e) {}
      };

      // ═══ RENDER: Vocabulary Trainer panel ═══
      var _vtOrder = 'priority'; // priority | cefr | pos

      window.vtSetOrder = function(btn, order) {
        _vtOrder = order;
        var bar = document.getElementById('vtReviewOrderToggles');
        if (bar) bar.querySelectorAll('.fchip').forEach(function(c){ c.classList.remove('active'); });
        btn.classList.add('active');
        renderVTReviewDue();
      };

      // Review Due — renders words as wbx-box cards with fatto/più tardi
      // ── Shared editorial "Spotlight" word-box template (matches dev/word-boxes-editorial-mockup.html) ──
      // o: {word, cefr, pos, ipa, def, trans, transOp, syns, lang('en'|'it'), exact, dismissible,
      //     saveTitle, bar('std'|'vt'), wid, ring, wfont}
      window.wbxCard = function(o){
        var word = o.word || '';
        var cefr = o.cefr || '';
        var pos = o.pos || '';
        var ipa = o.ipa || '—';
        var def = o.def || 'Caricamento…';
        var trans = o.trans || '';
        var transOp = (o.transOp !== undefined) ? o.transOp : (trans ? 1 : 0);
        var syns = o.syns || '';
        var lang = o.lang || 'en';
        var exact = o.exact ? ' wbx-exact' : '';
        var voiceBtns, cefrHtml, posHtml, barHtml, transStyle, widAttr;

        if (lang === 'it') {
          voiceBtns = '<button class="wbx-voice" data-voice="it" title="Ascolta" onclick="event.stopPropagation();wbxSpeak(this)"><i class="fa-solid fa-volume-high"></i></button>';
        } else {
          voiceBtns = '<button class="wbx-voice" data-voice="uk" title="Pronuncia britannica" onclick="event.stopPropagation();wbxSpeak(this)"><i class="fa-solid fa-volume-high"></i> UK</button>' +
                      '<button class="wbx-voice" data-voice="us" title="Pronuncia americana" onclick="event.stopPropagation();wbxSpeak(this)"><i class="fa-solid fa-volume-high"></i> US</button>';
        }
        cefrHtml = (cefr && cefr !== '—') ? '<span class="wbx-cefr">' + cefr + '</span>' : '';
        posHtml = (pos && pos !== '—') ? '<span class="wbx-pos">' + pos + '</span>' : '';
        transStyle = transOp ? ' style="opacity:1"' : ' style="opacity:0"';
        widAttr = o.wid ? ' data-wid="' + o.wid + '"' : '';

        if (o.bar === 'vt') {
          barHtml =
            '<button class="wbx-save-btn vt-fatto-btn" data-wid="' + o.wid + '" data-word="' + word + '" title="Fatto — la conosco" onclick="event.stopPropagation();vtMarkFatto(this)" style="font-size:22px">✓</button>' +
            '<button class="wbx-bookmark-btn vt-piutardi-btn" data-wid="' + o.wid + '" data-word="' + word + '" title="Più tardi — saltala per ora" onclick="event.stopPropagation();vtMarkPiuTardi(this)" style="font-size:18px">⏭</button>';
        } else {
          barHtml =
            '<button class="wbx-save-btn" data-word="' + word + '" data-level="' + cefr + '" data-pos="' + pos + '" title="' + (o.saveTitle || 'Aggiungi') + '">+</button>' +
            '<button class="wbx-dict-btn" data-word="' + word + '" data-level="' + cefr + '" data-pos="' + pos + '" title="Cerca in un dizionario"><i class="fa-solid fa-magnifying-glass"></i></button>' +
            (o.dismissible ? '<button class="wbx-close-btn" title="Rimuovi" onclick="event.stopPropagation();wbxDismissBox(this)">×</button>' : '');
        }

        return '<article class="wbx-box' + exact + '" data-word="' + word + '" data-pos="' + pos + '" data-cefr="' + cefr + '"' + widAttr + (o.ring ? ' style="border-left:3px solid ' + o.ring + '"' : '') + '>' +
          '<div class="wbx-main-col">' +
            '<div class="wbx-head"><div class="wbx-voices">' + voiceBtns + '</div>' + cefrHtml + '</div>' +
            '<div class="wbx-word-zone">' +
              '<div class="wbx-glow"></div>' +
              '<div class="wbx-w"' + (o.wfont || '') + '>' + word + '</div>' +
              '<div class="wbx-posipa">' + posHtml + '<span class="wbx-ipa">' + ipa + '</span></div>' +
            '</div>' +
            '<div class="wbx-meta-zone">' +
              '<div class="wbx-def">' + def + '</div>' +
              '<div class="wbx-trans"' + transStyle + '>' + (trans || '—') + '</div>' +
              '<div class="wbx-syns">' + syns + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="wbx-save-col">' + barHtml + '</div>' +
        '</article>';
      };

      async function renderVTReviewDue() {
        var cardsEl = document.getElementById('vtReviewGrid');
        var emptyEl = document.getElementById('vtReviewEmpty');
        var statsEl = document.getElementById('vtReviewStats');
        if (!cardsEl) return;
        var sb = window.sottotitoliSupabase;
        if (!sb) { cardsEl.innerHTML = '<div style="text-align:center;padding:30px 20px;color:var(--text-faint);font-size:13px">Accedi per vedere le parole da ripassare.</div>'; return; }
        var r = await sb.auth.getSession();
        if (!r.data || !r.data.session) { cardsEl.innerHTML = '<div style="text-align:center;padding:30px 20px;color:var(--text-faint);font-size:13px">Accedi per vedere le parole da ripassare.</div>'; return; }
        var userId = r.data.session.user.id;

        // Fetch reviewable words
        var nowISO = new Date().toISOString();
        var todayISO = new Date().toISOString().substring(0, 10);
        var q = sb.from('review_words')
          .select('id,lemma,pos,cefr,mastery_score,review_state,next_review_at,last_reviewed_at,personal_frequency')
          .eq('user_id', userId)
          .or('is_new.eq.true,next_review_at.lte.' + nowISO)
          .order('last_reviewed_at', { ascending: true, nullsFirst: true })
          .limit(40);
        var res = await q;
        var words = res.data || [];

        // Count mastered today (reviewed today)
        var masteredToday = 0;
        if (words.length) {
          words.forEach(function(w) {
            if (w.last_reviewed_at && w.last_reviewed_at.substring(0,10) === todayISO && w.review_state !== 'new') {
              masteredToday++;
            }
          });
        }

        // Stats
        if (statsEl) {
          statsEl.innerHTML =
            '<div class="wb-stat"><div class="stat-value">'+words.length+'</div><div class="stat-label">In programma oggi</div></div>'+
            '<div class="wb-stat"><div class="stat-value">'+masteredToday+'</div><div class="stat-label">Ripassate oggi</div></div>'+
            '<div class="wb-stat"><div class="stat-value">'+(words.length - masteredToday)+'</div><div class="stat-label">Da fare</div></div>';
        }
        // Update word count in title
        var countEl = document.getElementById('vtReviewWordCount');
        if (countEl) countEl.textContent = '(' + words.length + ')';

        // Empty state
        if (!words.length) {
          cardsEl.innerHTML = '';
          if (emptyEl) emptyEl.style.display = 'block';
          return;
        }
        if (emptyEl) emptyEl.style.display = 'none';

        // Sort
        if (_vtOrder === 'cefr') {
          var lvlRank = {A1:1,A2:2,B1:3,B2:4,C1:5,C2:6};
          words.sort(function(a,b){ return (lvlRank[a.cefr]||0) - (lvlRank[b.cefr]||0); });
        } else if (_vtOrder === 'pos') {
          words.sort(function(a,b){ return (a.pos||'').localeCompare(b.pos||''); });
        }
        // Default priority: new first, then by mastery asc

        // Store for quiz access
        window._vtReviewWords = words;

        // Render cards
        var html = '';
        words.forEach(function(w) {
          var word = w.lemma || '—';
          var cefr = w.cefr || '';
          var pos = w.pos || '';
          var posLabel = mapPos(pos);
          var isNew = w.review_state === 'new' || w.is_new;
          var isOverdue = w.next_review_at && new Date(w.next_review_at) < new Date();
          var ringColor = isNew ? 'var(--cyan)' : isOverdue ? 'var(--amber)' : 'var(--green)';

          var wordLen = word.length;
          var wordFontSize = wordLen <= 6 ? '28px' : wordLen <= 8 ? '22px' : wordLen <= 11 ? '17px' : '14px';

          var statusLine = (isNew ? '🆕 Nuova' : isOverdue ? '⚠️ In ritardo' : '📅 In programma');
          var freqLine = (w.personal_frequency ? 'Usata '+w.personal_frequency+'×' : '') +
              (w.last_reviewed_at ? ' · Ultimo ripasso: '+fmtDate(w.last_reviewed_at) : '') +
              (w.mastery_score ? ' · Mastery '+w.mastery_score+'%' : '');

          html += window.wbxCard({
            word: word, cefr: cefr, pos: posLabel,
            ipa: '<span class="wbx-status-tag" style="font-size:11px;color:'+(isOverdue?'var(--amber)':'var(--text-faint)')+'">'+statusLine+'</span> · <span style="font-size:11px;color:var(--text-faint)">'+freqLine+'</span>',
            def: 'Caricamento…', trans: '', transOp: 0, syns: '',
            lang: 'en', exact: false, dismissible: false,
            bar: 'vt', wid: w.id, ring: ringColor, wfont: 'style="font-size:'+wordFontSize+'"'
          });
        });
        cardsEl.innerHTML = html;
        if (window.WBToken) window.WBToken.refreshAll();

        // Enrich ALL cards with definitions (batch with stagger to avoid rate limits)
        var boxes = document.querySelectorAll('#vtReviewGrid .wbx-box');
        boxes.forEach(function(box, i) {
          setTimeout(function() {
            enrichOneCard(box, box.getAttribute('data-word'));
          }, i * 150); // 150ms stagger between cards
        });
      }
      window.renderVTReviewDue = renderVTReviewDue;

      // ── Fatto: mark word as reviewed (update review_words) ──
      window.vtMarkFatto = async function(btn) {
        var wid = btn.getAttribute('data-wid');
        if (!wid) return;
        btn.disabled = true;
        try {
          var sb = window.sottotitoliSupabase;
          if (sb) {
            var tomorrow = new Date(Date.now() + 24*3600000).toISOString();
            await sb.from('review_words').update({
              review_state: 'review',
              last_reviewed_at: new Date().toISOString(),
              next_review_at: tomorrow,
              is_new: false
            }).eq('id', wid);
          }
        } catch(e) { console.warn('vtMarkFatto:', e); }
        renderVTReviewDue();
      };

      // ── Più tardi: reschedule for later ──
      window.vtMarkPiuTardi = async function(btn) {
        var wid = btn.getAttribute('data-wid');
        if (!wid) return;
        btn.disabled = true;
        try {
          var sb = window.sottotitoliSupabase;
          if (sb) {
            var later = new Date(Date.now() + 4*3600000).toISOString();
            await sb.from('review_words').update({
              next_review_at: later,
              is_new: false
            }).eq('id', wid);
          }
        } catch(e) { console.warn('vtMarkPiuTardi:', e); }
        renderVTReviewDue();
      };

      // ── VT Style toggle (color schemes 1-7) ──
      // Tasks — renders active + completed from user_tasks
      async function renderVTTasks() {
        var tasks = await SottotitoliData.getTasks();
        var tbody = document.getElementById('vtTaskBody');
        var doneEl = document.getElementById('vtTasksDone');
        var addBtn = document.getElementById('vtAddTaskBtn');
        if (!tbody) return;
        if (addBtn) addBtn.style.display = 'inline-flex';
        if (!tasks || !tasks.length) {
          tbody.innerHTML = '<tr><td colspan="4" style="padding:16px;text-align:center;color:var(--text-faint);font-size:13px"><i class="fa-solid fa-pen-to-square"></i> &nbsp;Nessun compito attivo. Clicca <strong style="color:var(--teal)">Aggiungi</strong> per crearne uno.</td></tr>';
          if (doneEl) doneEl.innerHTML = '<div style="padding:12px;text-align:center;color:var(--text-faint);font-size:13px"><i class="fa-solid fa-clock"></i> &nbsp;Nessun compito completato</div>';
          return;
        }
        var statusColors = { doing: 'var(--cyan)', todo: 'var(--teal)', done: 'var(--green)' };
        var activeHtml = '';
        var doneHtml = '';
        tasks.forEach(function(t) {
          var sc = statusColors[t.status] || 'var(--teal)';
          if (t.status === 'done') {
            var timeSpent = '';
            if (t.completed_at && t.created_at) {
              var ms = new Date(t.completed_at) - new Date(t.created_at);
              var mins = Math.round(ms / 60000);
              var hrs = Math.floor(mins / 60);
              var days = Math.floor(hrs / 24);
              if (days > 0) timeSpent = days + 'gg';
              else if (hrs > 0) timeSpent = hrs + 'h ' + (mins % 60) + 'm';
              else timeSpent = mins + 'm';
            }
            doneHtml += '<div style="display:flex;justify-content:space-between;align-items:center"><span>' + t.title + '</span><span style="color:var(--text-faint);font-size:11px">' + fmtDate(t.created_at) + (timeSpent ? ' · ' + timeSpent : '') + '</span></div>';
          } else {
            activeHtml += '<tr class="task-row"><td style="padding:8px 10px"><span>' + t.title + '</span></td>' +
              '<td style="padding:8px 10px"><select style="padding:4px 8px;border-radius:8px;border:1px solid var(--line);background:var(--bg);font-size:11px;font-family:var(--font-ui);font-weight:600;color:' + sc + ';cursor:pointer" onchange="var v=this.value;var m={doing:\'var(--amber)\',todo:\'var(--teal)\',done:\'var(--green)\'};this.style.color=m[v];var upd={status:v};if(v===\'done\')upd.completed_at=new Date().toISOString();else upd.completed_at=null;SottotitoliData.updateTask(\'' + t.id + '\',upd).then(function(){renderVTTasks()})">' +
              '<option value="doing" style="color:var(--amber)"' + (t.status === 'doing' ? ' selected' : '') + '>In corso</option>' +
              '<option value="todo" style="color:var(--teal)"' + (t.status === 'todo' ? ' selected' : '') + '>Da fare</option>' +
              '<option value="done" style="color:var(--green)"' + (t.status === 'done' ? ' selected' : '') + '>Completato</option></select></td>' +
              '<td style="padding:8px 10px;font-size:11px;color:var(--text-faint)">' + fmtDate(t.created_at) + '</td>' +
              '<td style="padding:8px 10px"><button class="hv-danger-bg" aria-label="Elimina compito" style="border:none;background:none;color:var(--text-faint);cursor:pointer;font-size:13px;padding:2px 6px;border-radius:6px;transition:all var(--transition)" onclick="SottotitoliData.deleteTask(\'' + t.id + '\').then(function(){renderVTTasks()})"><svg class="icon" style="width:12px;height:12px"><use href=\'#i-close\'></use></svg></button></td></tr>';
          }
        });
        tbody.innerHTML = activeHtml || '<tr><td colspan="4" style="padding:16px;text-align:center;color:var(--text-faint);font-size:13px">🎉 Tutti i compiti sono completati!</td></tr>';
        if (doneEl) doneEl.innerHTML = doneHtml || '<div style="padding:12px;text-align:center;color:var(--text-faint);font-size:13px"><i class="fa-solid fa-clock"></i> &nbsp;Nessun compito completato</div>';
      }
      window.renderVTTasks = renderVTTasks;

      // Automated tasks — generated from review_words that are due today
      async function renderVTAutoTasks() {
        var autoEl = document.getElementById('vtAutoTasks');
        var doneEl = document.getElementById('vtAutoTasksDone');
        if (!autoEl) return;
        var sb = window.sottotitoliSupabase;
        if (!sb) { 
          autoEl.innerHTML = '<div style="padding:12px;text-align:center;color:var(--text-faint);font-size:13px"><i class="fa-solid fa-lock"></i> &nbsp;Accedi per vedere i task automatici.</div>'; 
          if (doneEl) doneEl.innerHTML = '<span>—</span>';
          return; 
        }
        var r = await sb.auth.getSession();
        if (!r.data || !r.data.session) { 
          autoEl.innerHTML = '<div style="padding:12px;text-align:center;color:var(--text-faint);font-size:13px"><i class="fa-solid fa-lock"></i> &nbsp;Accedi per vedere i task automatici.</div>'; 
          if (doneEl) doneEl.innerHTML = '<span>—</span>';
          return; 
        }
        var userId = r.data.session.user.id;
        var nowISO = new Date().toISOString();
        var q = sb.from('review_words')
          .select('id,lemma,pos,cefr,next_review_at,last_reviewed_at')
          .eq('user_id', userId)
          .or('is_new.eq.true,next_review_at.lte.' + nowISO)
          .order('last_reviewed_at', { ascending: true, nullsFirst: true })
          .limit(6);
        var res = await q;
        var words = res.data || [];
        if (!words.length) {
          autoEl.innerHTML = '<div style="padding:12px;text-align:center;color:var(--text-faint);font-size:13px"><i class="fa-solid fa-circle-check"></i> &nbsp;🎉 Nessuna parola da ripassare oggi. Fai una sessione per generare nuovi task.</div>';
          if (doneEl) doneEl.innerHTML = '<span style="color:var(--text-faint)">—</span>';
          return;
        }
        var html = '';
        var reviewedToday = 0;
        var todayStr = new Date().toISOString().substring(0,10);
        words.forEach(function(w) {
          var word = w.lemma || '—';
          var cefr = w.cefr || '';
          var pos = mapPos(w.pos || '');
          var isNew = w.is_new || w.review_state === 'new';
          var isOverdue = !isNew && w.next_review_at && new Date(w.next_review_at) < new Date();
          var badge = isNew ? '🆕 Nuova' : isOverdue ? '⚠️ In ritardo' : '📅 Oggi';
          var badgeColor = isNew ? 'var(--cyan)' : isOverdue ? 'var(--amber)' : 'var(--green)';
          html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--bg);border-radius:10px;border:1px solid var(--line);font-size:13px"><span><strong>' + word + '</strong>' + (cefr ? ' <span style="font-size:11px;color:var(--text-faint);background:var(--panel-2);padding:2px 6px;border-radius:4px">' + cefr + '</span>' : '') + (pos !== '—' ? ' <span style="font-size:11px;color:var(--text-faint)">' + pos + '</span>' : '') + '</span><span style="font-size:11px;color:' + badgeColor + ';font-weight:600">' + badge + '</span></div>';
          if (w.last_reviewed_at && w.last_reviewed_at.substring(0,10) === todayStr) reviewedToday++;
        });
        autoEl.innerHTML = html;
        if (doneEl) doneEl.innerHTML = reviewedToday > 0 ? '<span style="color:var(--green);font-weight:600">✓ ' + reviewedToday + ' parole ripassate oggi</span>' : '<span style="color:var(--text-faint)">Nessuna ancora oggi</span>';
      }
      window.renderVTAutoTasks = renderVTAutoTasks;
      window.__REACHED_VTQM__ = true;

      // ── VT Style toggle (color schemes 2,4,5,6,7) ──
      var _vtAccentIdx = (function(){ var s = localStorage.getItem('vt-accent-scheme')||'2'; var schemes=['2','4','5','6','7']; var i=schemes.indexOf(s); return i>=0?i:0; })();
      
      // Scheme palettes matching Build From What You Know
      var _vtSchemes = [
        { dark:'#0f1c24', border:'#0f1c24', text:'#fff', text2:'rgba(255,255,255,.5)', accent:'#06b6d4', trans:'#0f1c24' },
        { dark:'#0f2a1a', border:'#0f2a1a', text:'#fff', text2:'rgba(255,255,255,.5)', accent:'#10b981', trans:'#0f2a1a' },
        { dark:'#1a0f2e', border:'#1a0f2e', text:'#fff', text2:'rgba(255,255,255,.5)', accent:'#a78bfa', trans:'#1a0f2e' },
        { dark:'#2e2410', border:'#2e2410', text:'#fff', text2:'rgba(255,255,255,.5)', accent:'#d97706', trans:'#2e2410' },
        { dark:'#2a0f24', border:'#2a0f24', text:'#fff', text2:'rgba(255,255,255,.5)', accent:'#e879a4', trans:'#2a0f24' }
      ];
      var _vtSchemesDark = [
        { dark:'#d8eaf4', border:'#d8eaf4', text:'#0b151c', text2:'rgba(11,21,28,.5)', accent:'#0e7490', trans:'#d8eaf4' },
        { dark:'#a7f3d0', border:'#a7f3d0', text:'#0f2a1a', text2:'rgba(15,42,26,.5)', accent:'#34d399', trans:'#a7f3d0' },
        { dark:'#ddd6fe', border:'#ddd6fe', text:'#1a0f2e', text2:'rgba(26,15,46,.5)', accent:'#c4b5fd', trans:'#ddd6fe' },
        { dark:'#fde68a', border:'#fde68a', text:'#2e2410', text2:'rgba(46,36,16,.5)', accent:'#f59e0b', trans:'#fde68a' },
        { dark:'#fbcfe8', border:'#fbcfe8', text:'#2a0f24', text2:'rgba(42,15,36,.5)', accent:'#f472b6', trans:'#fbcfe8' }
      ];

      function vtApplyScheme() {
        var container = document.getElementById('vtReviewGrid');
        if (!container) return;
        // Set the scheme key so WBToken drives the editorial --w-* tokens (the legacy 'dark'
        // check below doesn't know modern/genz-dark, so WBToken is the source of truth).
        container.setAttribute('data-wb-scheme', ['2','4','5','6','7'][_vtAccentIdx]);
        var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        var s = isDark ? _vtSchemesDark[_vtAccentIdx] : _vtSchemes[_vtAccentIdx];
        container.style.setProperty('--sz-dark', s.dark);
        container.style.setProperty('--sz-dark-border', s.border);
        container.style.setProperty('--sz-darktext', s.text);
        container.style.setProperty('--sz-darktext2', s.text2);
        container.style.setProperty('--sz-accent', s.accent);
        container.style.setProperty('--sz-trans-border', s.trans);
      }

      window.vtCycleAccent = function() {
        _vtAccentIdx = (_vtAccentIdx + 1) % 5;
        vtApplyScheme();
        var btn = document.getElementById('vtAccentBtn');
        if (btn) btn.innerHTML = '<i class="fa-solid fa-palette"></i> ' + (_vtAccentIdx + 1); // renumbered 1-5 (schemes are 2,4,5,6,7)
        localStorage.setItem('vt-accent-scheme', ['2','4','5','6','7'][_vtAccentIdx]);
      };

      // Apply scheme on load
      vtApplyScheme();
      async function renderExpandStats() {
        var lang = window.SOTTOTITOLI_STUDY_LANG || 'en';
        var statsEl = document.getElementById('wbExpandStats');
        if (!statsEl) return;
        var s = { totalWords: 0, dueToday: 0, newThisWeek: 0, known: 0, learning: 0 };
        try {
          if (typeof SottotitoliData !== 'undefined' && SottotitoliData.getWordbankStats) {
            var live = await SottotitoliData.getWordbankStats(lang);
            if (live) s = live;
          }
        } catch(e) {}
        statsEl.innerHTML =
          '<div class="wb-stat"><div class="stat-value">'+s.totalWords+'</div><div class="stat-label">Totale parole</div></div>'+
          '<div class="wb-stat"><div class="stat-value">'+s.dueToday+'</div><div class="stat-label">In scadenza oggi</div></div>'+
          '<div class="wb-stat"><div class="stat-value">'+s.newThisWeek+'</div><div class="stat-label">Nuove questa settimana</div></div>'+
          '<div class="wb-stat"><div class="stat-value">'+s.known+'</div><div class="stat-label">Known</div></div>'+
          '<div class="wb-stat"><div class="stat-value">'+s.learning+'</div><div class="stat-label">Learning</div></div>';
      }

      async function renderExpandQuickChips() {
        var lang = window.SOTTOTITOLI_STUDY_LANG || 'en';
        var sb = window.sottotitoliSupabase;
        if (!sb) return;
        var r = await sb.auth.getSession();
        if (!r.data?.session) return;
        var userId = r.data.session.user.id;

        // Fetch user's known words from review_words (top 8 by frequency)
        var res = await sb.from('review_words')
          .select('lemma,pos,cefr,personal_frequency')
          .eq('user_id', userId)
          .order('personal_frequency', { ascending: false })
          .limit(8);
        var known = res.data || [];

        var container = document.getElementById('wbExpandQuickChips');
        if (!container) return;
        if (known.length === 0) {
          container.innerHTML = '<span style=\"font-size:13px;color:var(--text-faint)\">Nessuna parola conosciuta ancora. Inizia una sessione e salva parole!</span>';
          return;
        }
        var html = '';
        known.forEach(function(w) {
          var level = w.cefr || '';
          html += '<button type=\"button\" class=\"q-chip\" onclick=\"selectExpandWord(\'' + (w.lemma||'') + '\',\'' + (w.cefr||'') + '\')\" style=\"font-size:13px\">' + (w.lemma||'') + (level ? ' <span style=\"font-size:11px;opacity:.6\">' + level + '</span>' : '') + '</button>';
        });
        container.innerHTML = html;
      }

      function selectExpandWord(word, level) {
        var inp = document.getElementById('wbExpandSearch');
        if (inp) inp.value = word;
        var info = document.getElementById('wbExpandLevelInfo');
        if (info) info.textContent = level ? 'CEFR: ' + level : '';
        renderExpandSuggestions();
      }

      async function renderExpandSuggestions() {
        var inp = document.getElementById('wbExpandSearch');
        var relation = document.getElementById('wbExpandRelation');
        var results = document.getElementById('wbExpandResults');
        var info = document.getElementById('wbExpandLevelInfo');
        if (!inp || !results) return;

        var query = inp.value.trim();
        // Always reset disambiguation state on new search
        var disambig = document.getElementById('wbExpandDisambig');
        if (disambig) disambig.style.display = 'none';
        window._wbxSelectedPos = null;
        if (!query || query.length < 2) {
          results.innerHTML = '<div style="text-align:center;padding:40px 20px;color:var(--text-faint)"><div style="font-size:48px;color:var(--text-faint)"><i class="fa-solid fa-brain"></i></div></div>';
          if (info) info.textContent = '';
          return;
        }

        // Reset disambiguation on new search
        window._wbxSelectedPos = null;
        var disambigBar = document.getElementById('wbExpandDisambig');
        if (disambigBar) disambigBar.style.display = 'none';

        var rel = relation ? relation.value : 'synonyms';
        results.innerHTML = '<div style="text-align:center;padding:30px 20px;color:var(--text-faint)"><i class="fa-solid fa-spinner fa-spin"></i> Cercando suggerimenti…</div>';

        // Determine CEFR level of query word (for display)
        var wordLevel = null;
        if (window.CEFR_LEVELS && window.CEFR_LEVELS[query.toLowerCase()]) {
          wordLevel = window.CEFR_LEVELS[query.toLowerCase()];
        }
        if (!wordLevel) wordLevel = estimateCEFR(query) || '—';
        // (CEFR info now shown inside the exact word box, not as separate label)
        if (info) info.textContent = '';

        // ── Build Datamuse API URL based on relation ──
        var apiUrl = '';
        var enc = encodeURIComponent(query);
        switch (rel) {
          case 'synonyms':
            apiUrl = 'https://api.datamuse.com/words?ml=' + enc + '&max=20&md=p';
            break;
          case 'antonyms':
            apiUrl = 'https://api.datamuse.com/words?rel_ant=' + enc + '&max=20&md=p';
            break;
          case 'word-family':
            // Words starting with same prefix + means-like for related forms
            apiUrl = 'https://api.datamuse.com/words?sp=' + enc.substring(0, Math.min(4, enc.length)) + '*&md=p&max=30';
            break;
          case 'collocations':
            // Adjectives that modify this noun + words that frequently follow
            apiUrl = 'https://api.datamuse.com/words?rel_jjb=' + enc + '&max=10&md=p';
            break;
          case 'next-level':
            // Semantically related words — we'll filter by length as a proxy for complexity
            apiUrl = 'https://api.datamuse.com/words?ml=' + enc + '&max=30&md=p';
            break;
          default:
            apiUrl = 'https://api.datamuse.com/words?ml=' + enc + '&max=20&md=p';
        }

        try {
          // Check cache first
          var cacheKey = 'dm_' + rel + '_' + query.toLowerCase();
          var cached = _datamuseCache[cacheKey];
          var data = cached || null;
          if (!data) {
            var resp = await fetch(apiUrl);
            if (!resp.ok) throw new Error('API error ' + resp.status);
            data = await resp.json();
            _datamuseCache[cacheKey] = data;
          }

          // For collocations, also fetch words that follow the query
          var collocationExtra = [];
          if (rel === 'collocations') {
            try {
              var resp2 = await fetch('https://api.datamuse.com/words?lc=' + enc + '&max=10');
              if (resp2.ok) collocationExtra = await resp2.json();
            } catch(e) {}
          }

          // Merge results
          var allItems = data.concat(collocationExtra || []);

          // For word-family, filter to words that start similarly
          if (rel === 'word-family' && allItems.length > 20) {
            var prefix = query.toLowerCase().substring(0, 3);
            allItems = allItems.filter(function(item) {
              return item.word && item.word.toLowerCase().indexOf(prefix) === 0 && item.word.toLowerCase() !== query.toLowerCase();
            });
          }

          // Remove duplicates and the query word itself
          var seen = {};
          var suggestions = [];
          allItems.forEach(function(item) {
            var w = (item.word || '').toLowerCase().replace(/[^a-z\s'-]/g, '').replace(/\s+/g, ' ').trim();
            if (!w || w === query.toLowerCase() || seen[w]) return;
            seen[w] = true;
            // Determine CEFR level + POS for each suggestion
            var sl = window.CEFR_LEVELS && window.CEFR_LEVELS[w] ? window.CEFR_LEVELS[w] : (estimateCEFR(w) || '—');
            // Extract POS from tags — skip relation-type tags like "syn"
            var pos = extractPosFromTags(item.tags);
            if (pos === '—' && window.LEMMA_POS_MAP && window.LEMMA_POS_MAP[w]) {
              pos = window.LEMMA_POS_MAP[w];
            }
            // Tertiary fallback: enhanced Penn Treebank tagger
            if (pos === '—' && typeof nlp !== 'undefined') {
              pos = tagWordPenn(w) || pos;
            }
            // For 'next-level', keep only words at or above estimated level
            if (rel === 'next-level') {
              var levels = ['A1','A2','B1','B2','C1','C2'];
              if (levels.indexOf(sl) < levels.indexOf(wordLevel || 'A2')) return;
            }
            suggestions.push({ word: w, level: sl, pos: pos, score: item.score || 0 });
          });

          // Limit and sort by score
          suggestions.sort(function(a,b){ return b.score - a.score; });
          suggestions = suggestions.slice(0, 20);

          // Render
          if (suggestions.length === 0) {
            results.innerHTML = '<section class="alt-card-grid"><article class="alt-card"><h3>Nessun suggerimento</h3><p style="font-size:15px;color:var(--text-soft)">Nessuna parola trovata per "' + query + '" con relazione "' + relLabels(rel) + '". Prova con un\'altra parola o un\'altra relazione.</p></article></section>';
            return;
          }

          var relLabel = relLabels(rel);

          // Build exact-match card for the query word itself (dotted outline, first position)
          var exactLevel = wordLevel || estimateCEFR(query) || '—';
          var exactPos = '—';
          // Determine POS for the exact query word
          if (window.LEMMA_POS_MAP && window.LEMMA_POS_MAP[query.toLowerCase()]) {
            exactPos = window.LEMMA_POS_MAP[query.toLowerCase()];
          }
          // Enhanced Penn Treebank fallback
          if (exactPos === '—' && typeof nlp !== 'undefined') {
            exactPos = tagWordPenn(query.toLowerCase()) || exactPos;
          }
          var exactPosLabel = mapPos(exactPos);
          var exactCardHtml = window.wbxCard({
            word: query, cefr: exactLevel, pos: exactPosLabel, ipa: '—',
            def: 'Caricamento…', trans: '', transOp: 0, syns: '',
            lang: 'en', exact: true, dismissible: false, saveTitle: 'Aggiungi a Build From Known'
          });

          var cardsHtml = '';
          suggestions.forEach(function(s) {
            var posLabel = mapPos(s.pos);
            var displayWord = s.word;
            cardsHtml += window.wbxCard({
              word: displayWord, cefr: s.level, pos: posLabel, ipa: '—',
              def: 'Caricamento…', trans: '', transOp: 0, syns: '',
              lang: 'en', exact: false, dismissible: true, saveTitle: 'Aggiungi a Build From Known'
            });
          });
          results.innerHTML = '<div class="wbx-grid">' + exactCardHtml + cardsHtml + '</div>' +
            (suggestions.length > 5 ? '<div style="text-align:center;margin-top:16px"><button class="fchip" onclick="window.wbxShowMore(this)" style="font-size:15px;padding:10px 22px;font-family:var(--font-ui)"><i class="fa-solid fa-chevron-down"></i> Mostra di più (' + (suggestions.length - 5) + ')</button></div>' : '');
          if (window.WBToken) window.WBToken.refreshAll();
          // Auto-size long words
          setTimeout(window.autoSizeExpandWords, 100);
          // Check bank membership before enriching definitions
          enrichBankStatus();
          // Enrich cards with real definitions, translations, synonyms
          enrichExpandCards(query);
          // Background: check if query word has multiple POS (noun/verb/adjective)
          checkPosAmbiguity(query);

        } catch(e) {
          results.innerHTML = '<section class=\"alt-card-grid\"><article class=\"alt-card\"><h3>⚠️ Errore</h3><p style=\"font-size:15px;color:var(--text-soft)\">Impossibile raggiungere il servizio di suggerimenti. Riprova tra qualche secondo.</p></article></section>';
          console.warn('Datamuse API error:', e);
        }
      }
      window.renderExpandSuggestions = renderExpandSuggestions;

      function relLabels(rel) {
        var m = { synonyms: 'Sinonimi', antonyms: 'Contrari', 'word-family': 'Famiglia di parole', collocations: 'Collocazioni', 'next-level': 'Livello superiore' };
        return m[rel] || rel;
      }

      function mapPos(tag) {
        var m = { n: 'NOUN', v: 'VERB', adj: 'ADJ', adv: 'ADV', u: '—', other: '—', syn: '—', rhyme: '—', 'jjb': 'ADJ', 'jja': 'ADJ' };
        if (!tag) return '—';
        var t = tag.toLowerCase().trim();
        return m[t] || (t.length <= 3 ? t.toUpperCase() : t);
      }

      // ── Enhanced POS via Penn Treebank (nlp().compute('penn')) ──
      function tagWordPenn(w) {
        if (!w || typeof nlp === 'undefined') return null;
        try {
          var doc = nlp(w).compute('penn');
          var json = doc.json();
          if (json[0] && json[0].terms && json[0].terms[0] && json[0].terms[0].penn) {
            var penn = json[0].terms[0].penn;
            var pennMap = { NN:'n', NNS:'n', NNP:'n', NNPS:'n', VB:'v', VBD:'v', VBG:'v', VBN:'v', VBP:'v', VBZ:'v', MD:'v', JJ:'adj', JJR:'adj', JJS:'adj', RB:'adv', RBR:'adv', RBS:'adv' };
            return pennMap[penn] || null;
          }
          // Fallback: basic Compromise methods
          if (doc.nouns().found) return 'n';
          if (doc.verbs().found) return 'v';
          if (doc.adjectives().found) return 'adj';
          if (doc.adverbs().found) return 'adv';
        } catch(e) {}
        return null;
      }

      // Extract actual POS from Datamuse tags array (e.g. ["syn","v"] → "v")
      function extractPosFromTags(tags) {
        if (!tags || !tags.length) return '—';
        var posTags = ['n','v','adj','adv','u'];
        for (var i=0;i<tags.length;i++) {
          var t = (tags[i]||'').toLowerCase().trim();
          if (posTags.indexOf(t) >= 0) return t;
        }
        // Fallback: use LEMMA_POS_MAP
        return '—';
      }

      // ── Enrich cards with real dictionary + translation + synonym data ──
      async function enrichExpandCards(queryWord) {
        var boxes = document.querySelectorAll('#wbExpandResults .wbx-box');
        // Process 3 words at a time to avoid flooding APIs
        for (var i = 0; i < boxes.length; i += 3) {
          var batch = Array.from(boxes).slice(i, i + 3);
          await Promise.all(batch.map(function(box) { return enrichOneCard(box, queryWord); }));
        }
        // Sort: boxes with real definitions first, fallbacks last
        sortExpandBoxes();
        // Hide boxes beyond first 6 (1 exact + 5 suggestions) for mostra-di-più
        var allBoxes = document.querySelectorAll('#wbExpandResults .wbx-box');
        for (var j = 6; j < allBoxes.length; j++) {
          allBoxes[j].classList.add('wbx-hidden-initially');
        }
      }

      function sortExpandBoxes() {
        var grid = document.querySelector('#wbExpandResults .wbx-grid');
        if (!grid) return;
        var boxes = Array.from(grid.querySelectorAll('.wbx-box'));
        boxes.sort(function(a, b) {
          // Exact-match card always stays first
          if (a.classList.contains('wbx-exact')) return -1;
          if (b.classList.contains('wbx-exact')) return 1;
          var defA = (a.querySelector('.wbx-def')?.textContent || '').trim();
          var defB = (b.querySelector('.wbx-def')?.textContent || '').trim();
          var aIsFallback = defA === 'Caricamento…' || defA.indexOf('Parola suggerita') === 0;
          var bIsFallback = defB === 'Caricamento…' || defB.indexOf('Parola suggerita') === 0;
          if (aIsFallback && !bIsFallback) return 1;
          if (!aIsFallback && bIsFallback) return -1;
          return 0;
        });
        boxes.forEach(function(box) { grid.appendChild(box); });
      }

      // ── Check which words are already in the user's word bank ──
      async function enrichBankStatus(containerSelector) {
        var sel = containerSelector || '#wbExpandResults';
        var sb = window.sottotitoliSupabase;
        if (!sb) return;
        // Detect language from the container — Italian VB uses #wbItExpandResults
        var lang = (sel === '#wbItExpandResults') ? 'it' : 'en';
        try {
          var r = await sb.auth.getSession();
          if (!r.data?.session) return;
          var userId = r.data.session.user.id;
          var boxes = document.querySelectorAll(sel + ' .wbx-box');
          if (!boxes.length) return;
          var words = [];
          var seenW = {};
          boxes.forEach(function(b){
            var w = b.getAttribute('data-word');
            if (!w) return;
            w = w.toLowerCase().trim().replace(/^to\s+/, '');
            var head = w.split(/\s+/)[0];
            if (!head || head.length < 2 || !/^[a-z'-]+$/.test(head) || seenW[head]) return;
            seenW[head] = true;
            words.push(head);
          });
          if (!words.length) return;
        // Fix: user_wordbank_words has no user_id/lang columns — filter through
        // user_wordbanks (which owns user_id + lang) then query words by bank ids.
        var { data: langBanks } = await sb.from('user_wordbanks')
          .select('id').eq('user_id', userId).eq('lang', lang);
        var bankIds = (langBanks || []).map(function(b){ return b.id; });
        var bankSet = new Set();
        if (bankIds.length) {
          var { data: bankData } = await sb.from('user_wordbank_words')
            .select('wordbank_id,word').in('wordbank_id', bankIds).in('word', words);
          (bankData||[]).forEach(function(w){ bankSet.add(w.word.toLowerCase()); });
        }
          var { data: reviewData } = await sb.from('review_words')
            .select('word,personal_frequency,mastery_score').eq('user_id', userId).in('word', words);
          var reviewMap = {};
          (reviewData||[]).forEach(function(rw){ reviewMap[rw.word.toLowerCase()] = rw; });
          boxes.forEach(function(box){
            var w = (box.getAttribute('data-word')||'').toLowerCase();
            if (!bankSet.has(w)) return;
            box.classList.add('in-bank');
            var stats = reviewMap[w];
            var count = stats ? (stats.personal_frequency || 0) : 0;
            var mastery = stats ? Math.round(stats.mastery_score || 0) : 0;
            var meta = box.querySelector('.wbx-meta-zone');
            if (meta && !meta.querySelector('.wbx-card-stats')) {
              var sr = document.createElement('div');
              sr.className = 'wbx-card-stats';
              sr.innerHTML = '<span class="wbx-stat" data-tip="Usata ' + count + ' volte nelle tue sessioni"><i class="fa-solid fa-rotate"></i> ' + count + '×</span>' +
                '<span class="wbx-stat" data-tip="Padronanza stimata: ' + mastery + '% (basata sulle revisioni SRS)"><i class="fa-solid fa-bullseye"></i> ' + mastery + '%</span>';
              meta.appendChild(sr);
            }
            var saveBtn = box.querySelector('.wbx-save-btn');
            if (saveBtn) { saveBtn.classList.add('saved'); }
          });
        } catch(e) { /* silently skip */ }
      }

      async function enrichOneCard(box, queryWord) {
        var word = box.getAttribute('data-word');
        if (!word || word.length < 2) return;
        var posLabel = box.getAttribute('data-pos') || '';
        // Use bare word — POS label already disambiguates verb vs noun
        var apiWord = word;
        try {
          var defEl = box.querySelector('.wbx-def');
          var transEl = box.querySelector('.wbx-trans');
          var synsEl = box.querySelector('.wbx-syns');
          var ipaEl = box.querySelector('.wbx-ipa');

          // Fetch all 3 data sources in parallel — pass POS for dictionary disambiguation
          var preferredPos = extractPosCode(posLabel);
          var results = await Promise.allSettled([
            fetchDictionary(apiWord, preferredPos),
            fetchTranslationIT(apiWord),
            fetchSynonymsEN(word)
          ]);
          var dict = results[0].status === 'fulfilled' ? results[0].value : null;
          var trans = results[1].status === 'fulfilled' ? results[1].value : null;
          var syns = results[2].status === 'fulfilled' ? results[2].value : null;

          // Update definition
          if (dict && dict.definition && defEl) {
            defEl.textContent = dict.definition;
          } else if (defEl) {
            defEl.textContent = '—';
            defEl.style.color = 'var(--text-soft)';
          }

          // Update IPA
          if (dict && dict.ipa && ipaEl) {
            ipaEl.textContent = dict.ipa;
            ipaEl.style.color = '';
          }

          // Update translations
          if (trans && transEl) {
            var chips = trans.slice(0, 4).map(function(t){
              return '<span class="pc-trans-chip">' + t + '<button class="pc-trans-add" onclick="event.stopPropagation();saveItalianWordToBank(\'' + t.replace(/'/g,"\\'") + '\',this)" title="Aggiungi alla banca italiana">+</button></span>';
            }).join(' ');
            transEl.innerHTML = '→ ' + chips;
            transEl.style.opacity = '1';
          } else if (transEl) {
            transEl.style.display = 'none';
          }

          // Update synonym chips
          if (syns && syns.length && synsEl) {
            synsEl.innerHTML = syns.slice(0, 6).map(function(s){
              return '<span data-word="' + s + '" title="Clicca per esplorare">' + s + '</span>';
            }).join('');
          }
        } catch(e) {
          // Silently fail — card stays with "Caricamento…" which is acceptable
        }
      }

      // ── POS disambiguation: detect multi-POS words via Free Dictionary ──
      // Returns array of {code:'n', label:'NOUN'} or null
      async function fetchPosOptions(word) {
        try {
          var resp = await fetch('https://qzqmuegbpmvqrjrlfbgk.supabase.co/functions/v1/dictionary-proxy?word=' + encodeURIComponent(word));
          if (!resp.ok) return null;
          var data = await resp.json();
          if (!data) return null;
          // The proxy returns simplified format { definition, ipa } — POS disambiguation
          // needs the raw format. Try the raw Free Dictionary API directly for POS data.
          var rawResp = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(word));
          if (!rawResp.ok) return null;
          data = await rawResp.json();
          if (!data || !data.length) return null;
          var posSet = {};
          var posMap = { noun:'n', verb:'v', adjective:'adj', adverb:'adv', interjection:'—', pronoun:'—', preposition:'—', conjunction:'—', determiner:'—', numeral:'—' };
          var labelMap = { n:'NOUN', v:'VERB', adj:'ADJ', adv:'ADV' };
          for (var i = 0; i < data.length; i++) {
            var meanings = data[i].meanings || [];
            for (var j = 0; j < meanings.length; j++) {
              var pos = (meanings[j].partOfSpeech || '').toLowerCase().trim();
              var code = posMap[pos];
              if (code && code !== '—' && !posSet[code]) {
                posSet[code] = { code: code, label: labelMap[code] || pos.toUpperCase() };
              }
            }
          }
          var options = Object.values(posSet);
          return options.length >= 2 ? options : null;
        } catch(e) { return null; }
      }

      // ── Show did-you-mean bar with clickable POS chips ──
      function showPosDisambig(options, queryWord, currentPos) {
        var bar = document.getElementById('wbExpandDisambig');
        var chips = document.getElementById('wbDisambigChips');
        var ctx = document.getElementById('wbDisambigContext');
        if (!bar || !chips) return;
        bar.style.display = 'flex';
        if (ctx) ctx.textContent = 'You searched for \'' + queryWord + '\'. This word has different meanings.';
        chips.innerHTML = options.map(function(opt, idx) {
          var isActive = (currentPos && opt.code === currentPos) || (!currentPos && idx === 0);
          return '<button class="fchip' + (isActive ? ' active' : '') + '" data-pos-code="' + opt.code + '" data-pos-label="' + opt.label + '" onclick="window.wbxSelectPos(this,\'' + queryWord + '\')" style="font-size:13px;padding:7px 14px;font-family:var(--font-ui)">' + opt.label + '</button>';
        }).join('');
      }

      // ── Dismiss a suggestion box with animation ──
      window.wbxDismissBox = function(btn) {
        var box = btn.closest('.wbx-box');
        if (!box || box.classList.contains('wbx-exact')) return;
        box.style.opacity = '0';
        box.style.transform = 'scale(.9)';
        box.style.transition = 'all .25s ease-in';
        box.style.pointerEvents = 'none';
        setTimeout(function(){ box.remove(); }, 260);
      };

      // ── User clicked a POS chip — update exact box & re-enrich ──
      window.wbxSelectPos = function(chip, queryWord) {
        // Update chip active state
        var bar = document.getElementById('wbExpandDisambig');
        bar.querySelectorAll('.fchip').forEach(function(c){ c.classList.remove('active'); });
        chip.classList.add('active');
        var newCode = chip.getAttribute('data-pos-code');
        var newLabel = chip.getAttribute('data-pos-label');
        window._wbxSelectedPos = newCode;

        // Update the exact-match box
        var exactBox = document.querySelector('#wbExpandResults .wbx-box.wbx-exact');
        if (exactBox) {
          exactBox.setAttribute('data-pos', newLabel);
          var posEl = exactBox.querySelector('.wbx-pos');
          if (posEl) posEl.textContent = newLabel;
          exactBox.querySelectorAll('.wbx-save-btn, .wbx-dict-btn').forEach(function(btn){
            btn.setAttribute('data-pos', newLabel);
          });
          var defEl = exactBox.querySelector('.wbx-def');
          if (defEl) defEl.textContent = 'Caricamento…';
          var transEl = exactBox.querySelector('.wbx-trans');
          if (transEl) { transEl.style.opacity = '0'; transEl.textContent = '—'; }
          var synsEl = exactBox.querySelector('.wbx-syns');
          if (synsEl) synsEl.innerHTML = '';
        }

        // Re-enrich the exact box with new POS context
        if (exactBox) {
          enrichOneCard(exactBox, queryWord);
        }

        // Clear and re-fetch suggestion cards with new POS context
        var grid = document.querySelector('#wbExpandResults .wbx-grid');
        if (grid) {
          var allBoxes = grid.querySelectorAll('.wbx-box:not(.wbx-exact)');
          allBoxes.forEach(function(b){ b.style.opacity = '0.4'; b.style.transition = 'opacity .2s'; });
          // Re-run the Datamuse query with POS filter
          var input = document.getElementById('wbExpandSearch');
          var rel = document.getElementById('wbExpandRelation');
          if (input && rel) {
            var currentRel = rel.value || 'synonyms';
            reQuerySuggestions(queryWord, currentRel, newCode).then(function(newSuggestions){
              // Remove old suggestion boxes
              allBoxes.forEach(function(b){ b.remove(); });
              if (newSuggestions && newSuggestions.length) {
                var cardsHtml = '';
                newSuggestions.forEach(function(s){
                  var posLabel = mapPos(s.pos);
                  cardsHtml += window.wbxCard({
                    word: s.word, cefr: s.level, pos: posLabel, ipa: '—',
                    def: 'Caricamento…', trans: '', transOp: 0, syns: '',
                    lang: 'en', exact: false, dismissible: true, saveTitle: 'Aggiungi a Build From Known'
                  });
                });
                grid.insertAdjacentHTML('beforeend', cardsHtml);
                if (window.WBToken) window.WBToken.refreshAll();
                // Re-enrich new cards and check bank status
                enrichBankStatus();
                enrichExpandCards(queryWord);
              }
            });
          }
        }
      };

      // ── Re-query Datamuse with POS filter ──
      var _datamuseCache = {};
      async function reQuerySuggestions(word, rel, posCode) {
        try {
          var cacheKey = word + '|' + rel + '|' + (posCode || '');
          if (_datamuseCache[cacheKey]) return _datamuseCache[cacheKey];
          var posTopic = { n:'noun', v:'verb', adj:'adj', adv:'adv' }[posCode] || '';
          var url = 'https://api.datamuse.com/words?' + relMap[rel] + '=' + encodeURIComponent(word) + '&max=20';
          if (posTopic) url += '&topics=' + posTopic;
          var resp = await fetch(url);
          if (!resp.ok) return [];
          var data = await resp.json();
          var result = data.map(function(d){
            var tags = d.tags || [];
            var pos = '—';
            if (tags.indexOf('n') >= 0) pos = 'n';
            else if (tags.indexOf('v') >= 0) pos = 'v';
            else if (tags.indexOf('adj') >= 0) pos = 'adj';
            else if (tags.indexOf('adv') >= 0) pos = 'adv';
            // Enhanced POS via lemma map
            if (pos === '—' && window.LEMMA_POS_MAP && window.LEMMA_POS_MAP[d.word.toLowerCase()]) {
              pos = window.LEMMA_POS_MAP[d.word.toLowerCase()];
            }
            return { word: d.word, pos: pos, level: estimateCEFR(d.word) || '—', frequency_count: d.score || 0 };
          }).filter(function(s){ return !posCode || s.pos === posCode || s.pos === '—'; }).slice(0, 15);
          _datamuseCache[cacheKey] = result;
          return result;
        } catch(e) { return []; }
      }
      var relMap = { synonyms:'rel_syn', antonyms:'rel_ant', 'word-family':'rel_spc', collocations:'rel_jjb', 'next-level':'ml' };

      // ── Background check for POS ambiguity after results load ──
      async function checkPosAmbiguity(queryWord) {
        var options = await fetchPosOptions(queryWord);
        if (!options || options.length < 2) return;
        // Determine current POS from the exact box
        var exactBox = document.querySelector('#wbExpandResults .wbx-box.wbx-exact');
        var currentPos = exactBox ? extractPosCode(exactBox.getAttribute('data-pos') || '') : null;
        showPosDisambig(options, queryWord, currentPos);
      }

      function extractPosCode(label) {
        var m = { NOUN:'n', VERB:'v', ADJ:'adj', ADV:'adv' };
        return m[label] || null;
      }

      // ── Third dictionary source removed (see docs/ai/pos-cefr-sources.md benchmark). ──

      // ── Free Dictionary API (direct first — 18/20 coverage, ~230ms; proxy is slower + thinner) ──
      var _fdCache = {};
      async function fetchFreeDict(word, preferredPos) {
        var ck = word.toLowerCase() + '|' + (preferredPos || '');
        var cached = _fdCache[ck];
        if (cached && cached.t > Date.now() - 30000) return cached.v;
        var store = function(v){ _fdCache[ck] = { t: Date.now(), v: v }; return v; };
        // Direct API
        try {
          var resp = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(word));
          if (!resp.ok) throw new Error('direct miss');
          var data = await resp.json();
          if (!data || !data.length) throw new Error('empty');
          var entry = data[0];
          var def = '';
          var ipa = '';
          var posToFD = { n:'noun', v:'verb', adj:'adjective', adv:'adverb' };
          var preferredFD = preferredPos ? posToFD[preferredPos] : null;
          if (entry.meanings && entry.meanings.length) {
            if (preferredFD) {
              for (var i = 0; i < entry.meanings.length; i++) {
                var m = entry.meanings[i];
                if ((m.partOfSpeech || '').toLowerCase() === preferredFD && m.definitions && m.definitions.length) {
                  def = m.definitions[0].definition; break;
                }
              }
            }
            if (!def) {
              for (var i2 = 0; i2 < entry.meanings.length; i2++) {
                var m2 = entry.meanings[i2];
                if (m2.definitions && m2.definitions.length) { def = m2.definitions[0].definition; break; }
              }
            }
          }
          if (entry.phonetics && entry.phonetics.length) {
            for (var j = 0; j < entry.phonetics.length; j++) {
              if (entry.phonetics[j].text) { ipa = entry.phonetics[j].text; break; }
            }
          }
          var fdPos = (entry.meanings && entry.meanings.length) ? (entry.meanings[0].partOfSpeech || '') : '';
          if (def) return store({ definition: def, ipa: ipa, pos: fdPos });
        } catch(e) { /* fall through to proxy */ }

        // Proxy fallback (cached, server-side — simplified {definition, ipa, notFound} format)
        try {
          var resp2 = await fetch('https://qzqmuegbpmvqrjrlfbgk.supabase.co/functions/v1/dictionary-proxy?word=' + encodeURIComponent(word));
          if (!resp2.ok) return store(null);
          var pdata = await resp2.json();
          if (!pdata) return store(null);
          if (pdata.definition !== undefined) {
            if (pdata.notFound) return store(null);
            return store({ definition: pdata.definition, ipa: pdata.ipa || '' });
          }
          if (!pdata.length) return store(null);
          var pentry = pdata[0];
          if (!pentry || !pentry.meanings || !pentry.meanings.length) return store(null);
          var pdef = pentry.meanings[0].definitions && pentry.meanings[0].definitions.length ? pentry.meanings[0].definitions[0].definition : '';
          var pipa = '';
          if (pentry.phonetics && pentry.phonetics.length) {
            for (var pj = 0; pj < pentry.phonetics.length; pj++) {
              if (pentry.phonetics[pj].text) { pipa = pentry.phonetics[pj].text; break; }
            }
          }
          return store(pdef ? { definition: pdef, ipa: pipa, pos: pentry.meanings[0].partOfSpeech || '' } : null);
        } catch(e) { return store(null); }
      }

      // ── WordsAPI (RapidAPI) — English definitions upgrade ──
      async function fetchWordsApi(word) {
        var cfg = (window.SOTTOTITOLI_CONFIG && window.SOTTOTITOLI_CONFIG.rapidApi) || {};
        var key = cfg.key || '';
        var host = cfg.wordsApiHost || 'wordsapiv1.p.rapidapi.com';
        if (!key || key === 'RAPIDAPI_KEY_PLACEHOLDER') return null;
        try {
          var resp = await fetch('https://' + host + '/words/' + encodeURIComponent(word.toLowerCase()) + '/definitions', {
            headers: { 'X-RapidAPI-Key': key, 'X-RapidAPI-Host': host }
          });
          if (!resp.ok) return null;
          var data = await resp.json();
          if (data && data.definitions && data.definitions.length) {
            return { definition: data.definitions[0].definition, ipa: null, pos: data.definitions[0].partOfSpeech || '' };
          }
          return null;
        } catch(e) { return null; }
      }

      // ── Combined: NGSL (local) → Free Dictionary (direct → proxy) → WordsAPI ──
      async function fetchDictionary(word, preferredPos) {
        // 1. Local NGSL first — instant, offline, curated (def + pos + IPA)
        var ng = (window.EN_NGSL || {})[word.toLowerCase()];
        if (ng && ng[3]) {
          var ngPosMap = { v:'verb', n:'noun', adj:'adjective', adv:'adverb' };
          return { definition: ng[3], ipa: ng[2] || '', pos: ngPosMap[ng[1]] || '' };
        }
        // 2. Free Dictionary (direct API first, proxy fallback) — IPA + POS-aware
        var fd = await fetchFreeDict(word, preferredPos);
        if (fd && fd.definition) return fd;
        // 3. WordsAPI (RapidAPI) — wider coverage than Free Dictionary
        var wa = await fetchWordsApi(word);
        if (wa && wa.definition) return wa;
        // Nothing found
        return null;
      }

      // ── MyMemory Translation (EN → IT) ──
      async function fetchTranslationIT(word) {
        try {
          var resp = await fetch('https://api.mymemory.translated.net/get?q=' + encodeURIComponent(word) + '&langpair=en|it');
          if (!resp.ok) return null;
          var data = await resp.json();
          if (data.responseData && data.responseData.translatedText) {
            var txt = data.responseData.translatedText;
            // MyMemory returns comma-separated or single translation
            return txt.split(/[,;]/).map(function(t){ return t.trim(); }).filter(function(t){ return t && t.toLowerCase() !== word.toLowerCase(); });
          }
          return null;
        } catch(e) { return null; }
      }

      // ── Datamuse synonyms (means-like) ──
      async function fetchSynonymsEN(word) {
        try {
          var resp = await fetch('https://api.datamuse.com/words?ml=' + encodeURIComponent(word) + '&max=8');
          if (!resp.ok) return null;
          var data = await resp.json();
          if (!data || !data.length) return null;
          return data.map(function(item){ return item.word; }).filter(function(w){ return w && w.toLowerCase() !== word.toLowerCase(); });
        } catch(e) { return null; }
      }

      function levelToColor(level) {
        var m = { A1: '#059669', A2: '#0895b0', B1: '#0e7490', B2: '#7c3aed', C1: '#d97706', C2: '#dc2626' };
        return m[level] || 'var(--text-faint)';
      }

      // No length heuristic — unknown words stay '—' (honest, no fabrication).
      function estimateCEFR(word) {
        if (!word) return null;
        var key = word.toLowerCase();
        if (window.CEFR_LEVELS && window.CEFR_LEVELS[key]) return window.CEFR_LEVELS[key];
        return null;
      }

      async function saveExpandWord(word, level, pos) {
        var sb = window.sottotitoliSupabase;
        if (!sb) return;
        var r = await sb.auth.getSession();
        if (!r.data?.session) { appAlert('Accedi per salvare parole.', 'Accesso richiesto', '🔒'); return; }
        var userId = r.data.session.user.id;
        var lang = window.SOTTOTITOLI_STUDY_LANG || 'en';

        // Check if user selected a specific save target bank
        var targetBankId = getSaveTargetBank(lang);
        var targetBank;
        if (targetBankId) {
          // Logical pinned targets resolve to their real bank by name
          var logicalNames = { saved_from_sessions: 'Saved from sessions', vocab_builder_en: 'English Vocabulary Builder', it_vocab_builder: 'Italian Vocabulary Builder' };
          if (logicalNames[targetBankId]) {
            var allBanks = await SottotitoliData.getWordbanks(lang);
            targetBank = allBanks.find(function(b){ return b.name === logicalNames[targetBankId]; }) || null;
          } else if (/^[0-9a-f]{8}-[0-9a-f]{4}/.test(targetBankId)) {
            var { data: bank } = await sb.from('user_wordbanks').select('*').eq('id', targetBankId).single();
            targetBank = bank;
          }
        }
        if (!targetBank) {
          // Fallback: "English Vocabulary Builder" bank (default for VB saves)
          var banks = await SottotitoliData.getWordbanks(lang);
          targetBank = banks.find(function(b) { return b.name === 'English Vocabulary Builder'; });
          if (!targetBank) {
            var createRes = await sb.from('user_wordbanks').insert({ user_id: userId, name: 'English Vocabulary Builder', lang: lang }).select().single();
            if (createRes.error) { console.warn('create bank:', createRes.error.message); return; }
            targetBank = createRes.data;
          }
        }
        // Only insert columns that exist in user_wordbank_words: wordbank_id, word, pos, usage_count
        var insertRes = await sb.from('user_wordbank_words').insert({
          wordbank_id: targetBank.id, word: word, pos: pos || null, usage_count: 1
        });
        if (insertRes.error) { console.warn('save word:', insertRes.error.message); return; }
        // ═══ Also upsert to review_words (feeds pinned banks) ═══
        try {
          var clean = word.replace(/[^a-zA-Z0-9 '-]/g, '').trim();
          if (clean && clean.length >= 2) {
            var norm = clean.toLowerCase();
            var rwRes = await sb.from('review_words').select('id,personal_frequency').eq('user_id', userId).eq('lemma', clean).maybeSingle();
            if (rwRes.data) {
              var rwUpdate = { personal_frequency: (rwRes.data.personal_frequency || 0) + 1 };
              if (pos) rwUpdate.pos = pos;
              await sb.from('review_words').update(rwUpdate).eq('id', rwRes.data.id);
            } else {
              await sb.from('review_words').insert({
                user_id: userId, lemma: clean, normalized: norm, lang: lang,
                pos: pos || null, is_new: true, first_seen_at: new Date().toISOString(),
                source_type: 'expand', review_state: 'new',
                personal_frequency: 1
              });
            }
          }
        } catch(rwErr) { /* review_words table might not exist */ }
        SottotitoliData.cacheClear();
        // Toast
        var t = document.createElement('div');
        t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--green);color:#fff;font-size:13px;font-weight:700;padding:10px 24px;border-radius:99px;z-index:99999;opacity:0;transition:opacity .3s;pointer-events:none;font-family:var(--font-body)';
        t.textContent = '✓ ' + word + ' salvato in Build From Known';
        document.body.appendChild(t);
        requestAnimationFrame(function() { t.style.opacity = '1'; });
        setTimeout(function() { t.style.opacity = '0'; setTimeout(function() { t.remove(); }, 300); }, 2000);
      }

      function openExpandWordDetail(word, level) {
        // Open the word drawer if available, otherwise navigate to word in bank
        if (typeof openWbDrawer === 'function') {
          var found = _wbState.currentWords.find(function(w) { return w.word.toLowerCase() === word.toLowerCase(); });
          if (found && found.id) { openWbDrawer(found.id); return; }
        }
        // Fallback: just highlight the word
        appAlert(word + ' (' + level + ') — salva la parola per visualizzarla nel dettaglio.', 'Parola trovata', '📖');
      }

      // ═══ WBX — Event delegation for save / bookmark / close buttons ═══
      document.addEventListener('click', function(e) {
        var btn = e.target.closest('.wbx-save-btn');
        if (!btn) return;
        e.stopPropagation();
        var word = btn.getAttribute('data-word');
        var level = btn.getAttribute('data-level');
        var pos = btn.getAttribute('data-pos');
        if (!word) return;
        // Detect if click came from Italian Vocabulary Builder subtab
        var isItalian = btn.closest('#sub-wb-expand-it');
        if (isItalian) {
          // Route to Italian save path
          window.saveItalianWordToBank(word, btn);
          return;
        }
        saveExpandWord(word, level, pos);
        btn.classList.add('saved');
        btn.textContent = '✓';
      });

      // ── Event delegation: dictionary button (magnifier) opens the dictionary popup ──
      window.wbxDictLinks = function(word) {
        var raw = String(word || '').trim().toLowerCase();
        var hyp = raw.replace(/\s+/g, '-');
        var und = raw.replace(/\s+/g, '_');
        var enc = encodeURIComponent(raw);
        return [
          { name:'Cambridge', dom:'dictionary.cambridge.org', url:'https://dictionary.cambridge.org/dictionary/learner-english/' + hyp },
          { name:'Oxford Learner\'s', dom:'oxfordlearnersdictionaries.com', url:'https://www.oxfordlearnersdictionaries.com/definition/english/' + und + '_1?q=' + enc },
          { name:'Longman', dom:'ldoceonline.com', url:'https://www.ldoceonline.com/dictionary/' + hyp },
          { name:'Wiktionary', dom:'en.wiktionary.org', url:'https://en.wiktionary.org/wiki/' + und }
        ];
      };
      window.wbxOpenDict = function(btn) {
        var open = document.querySelector('.wbx-dict-dd');
        if (open) open.remove();
        var box = btn.closest('.wbx-box');
        if (!box) return;
        var word = btn.getAttribute('data-word');
        if (!word) return;
        var links = window.wbxDictLinks(word);
        var dd = document.createElement('div');
        dd.className = 'wbx-dict-dd';
        var html = '<div class="wbx-dict-title">Cerca «' + word + '» in</div>';
        links.forEach(function(l){
          html += '<button type="button" class="wbx-dict-row" onclick="event.stopPropagation();window.wbxOpenDictLink(this)" data-url="' + l.url.replace(/"/g, '&quot;') + '">' +
                  '<img src="https://www.google.com/s2/favicons?domain=' + l.dom + '&sz=64" alt="" loading="lazy">' +
                  '<span class="dd-name">' + l.name + '</span><span class="dd-dom">↗</span></button>';
        });
        dd.innerHTML = html;
        box.appendChild(dd);
      };
      // Open in a new tab WITHOUT jumping to it (stays in background)
      window.wbxOpenDictLink = function(row) {
        var url = row.getAttribute('data-url');
        if (url) {
          var w = window.open(url, '_blank');
          if (w) { try { w.blur(); } catch(e){} }
          window.focus();
        }
        var dd = row.closest('.wbx-dict-dd');
        if (dd) dd.remove();
      };
      document.addEventListener('click', function(e) {
        var btn = e.target.closest('.wbx-dict-btn');
        if (!btn) return;
        e.stopPropagation();
        window.wbxOpenDict(btn);
      });
      // Close the dictionary popup on outside click
      document.addEventListener('click', function(e) {
        var dd = document.querySelector('.wbx-dict-dd');
        if (dd && !dd.contains(e.target) && !e.target.closest('.wbx-dict-btn')) dd.remove();
      });

      // ── Event delegation: close button (dismiss card) ──
      document.addEventListener('click', function(e) {
        var btn = e.target.closest('.wbx-close-btn');
        if (!btn) return;
        e.stopPropagation();
        wbxDismissBox(btn);
      });

      // ── Event delegation: synonym chip click → expand box inline ──
      document.addEventListener('click', function(e) {
        var chip = e.target.closest('.wbx-syns span[data-word]');
        if (!chip) return;
        e.stopPropagation();
        var word = chip.getAttribute('data-word');
        var box = chip.closest('.wbx-box');
        if (!box || !word) return;

        // Prevent duplicates — check if this word already expanded after this box
        var dup = false;
        var sib = box.nextElementSibling;
        while (sib) {
          if (sib.classList.contains('expanded') && sib.getAttribute('data-word') === word) { dup = true; break; }
          sib = sib.nextElementSibling;
        }
        if (dup) return;

        expandWordBox(word, box);
      });

      // ── Event delegation: close expanded box ──
      document.addEventListener('click', function(e) {
        var btn = e.target.closest('.wbx-close-exp');
        if (!btn) return;
        e.stopPropagation();
        var box = btn.closest('.wbx-box.expanded');
        if (box) { box.style.opacity = '0'; box.style.transform = 'scale(.95)'; box.style.transition = 'all .2s'; setTimeout(function(){ box.remove(); }, 200); }
      });

      // ── Expand a word into a new box inserted right after sourceBox ──
      async function expandWordBox(word, sourceBox) {
        // Build loading placeholder
        var loadingHtml = '<article class="wbx-box expanded" data-word="' + word + '" style="opacity:0.65">' +
          '<button class="wbx-close-exp" title="Chiudi">×</button>' +
          '<div class="wbx-main-col">' +
          '<div class="wbx-head"><div class="wbx-voices"><button class="wbx-voice" data-voice="uk" title="Pronuncia britannica" onclick="event.stopPropagation();wbxSpeak(this)"><i class="fa-solid fa-volume-high"></i> UK</button><button class="wbx-voice" data-voice="us" title="Pronuncia americana" onclick="event.stopPropagation();wbxSpeak(this)"><i class="fa-solid fa-volume-high"></i> US</button></div><span class="wbx-cefr">…</span></div>' +
          '<div class="wbx-word-zone"><div class="wbx-glow"></div><div class="wbx-w">' + word + '</div><div class="wbx-posipa"><span class="wbx-pos">…</span><span class="wbx-ipa">—</span></div></div>' +
          '<div class="wbx-meta-zone"><div class="wbx-def">Caricamento…</div><div class="wbx-trans" style="opacity:0">—</div><div class="wbx-syns"></div></div>' +
          '</div>' +
          '<div class="wbx-save-col"><button class="wbx-save-btn" data-word="' + word + '">+</button><button class="wbx-dict-btn" data-word="' + word + '" title="Cerca in un dizionario"><i class="fa-solid fa-magnifying-glass"></i></button><button class="wbx-close-btn">×</button></div>' +
          '</article>';
        var temp = document.createElement('div');
        temp.innerHTML = loadingHtml;
        var newBox = temp.firstChild;
        sourceBox.insertAdjacentElement('afterend', newBox);
        newBox.scrollIntoView({behavior: 'smooth', block: 'nearest'});

        // Fetch real data — use "to " prefix for verbs to disambiguate
        var rawPos = (window.LEMMA_POS_MAP && window.LEMMA_POS_MAP[word]) ? window.LEMMA_POS_MAP[word] : '—';
        // Enhanced Penn Treebank fallback
        if (rawPos === '—' && typeof nlp !== 'undefined') {
          rawPos = tagWordPenn(word) || rawPos;
        }
        var posLabel = mapPos(rawPos);
        var apiWord = posLabel === 'VERB' ? 'to ' + word : word;
        var displayWord = posLabel === 'VERB' ? 'to ' + word : word;
        try {
          var results = await Promise.allSettled([fetchDictionary(apiWord), fetchTranslationIT(apiWord), fetchSynonymsEN(word)]);
          var dict = results[0].status === 'fulfilled' ? results[0].value : null;
          var trans = results[1].status === 'fulfilled' ? results[1].value : null;
          var syns = results[2].status === 'fulfilled' ? results[2].value : null;

          var level = (window.CEFR_LEVELS && window.CEFR_LEVELS[word]) ? window.CEFR_LEVELS[word] : (estimateCEFR(word) || '—');

          // Update header
          var wEl = newBox.querySelector('.wbx-w'); if (wEl) wEl.textContent = displayWord;
          var cefrEl = newBox.querySelector('.wbx-cefr'); if (cefrEl) cefrEl.textContent = level;
          var posEl = newBox.querySelector('.wbx-pos'); if (posEl) posEl.textContent = posLabel;
          newBox.setAttribute('data-pos', posLabel);
          newBox.setAttribute('data-cefr', level);
          if (window.WBToken) window.WBToken.refreshAll();
          // Update save/bookmark data attributes
          var svBtn = newBox.querySelector('.wbx-save-btn'); if (svBtn) { svBtn.setAttribute('data-level', level); svBtn.setAttribute('data-pos', posLabel); }
          var bmBtn = newBox.querySelector('.wbx-dict-btn'); if (bmBtn) { bmBtn.setAttribute('data-level', level); bmBtn.setAttribute('data-pos', posLabel); }

          // Definition
          if (dict && dict.definition) {
            var defEl = newBox.querySelector('.wbx-def'); if (defEl) defEl.textContent = dict.definition;
          } else {
            var defEl = newBox.querySelector('.wbx-def'); if (defEl) defEl.textContent = 'Parola correlata';
          }
          // IPA
          if (dict && dict.ipa) {
            var ipaEl = newBox.querySelector('.wbx-ipa'); if (ipaEl) { ipaEl.textContent = dict.ipa; ipaEl.style.color = ''; }
          }
          // Translations
          if (trans && trans.length) {
            var transEl = newBox.querySelector('.wbx-trans');
            if (transEl) {
              var chips = trans.slice(0, 4).map(function(t){ return '<span class="pc-trans-chip">' + t + '<button class="pc-trans-add" onclick="event.stopPropagation();saveItalianWordToBank(\'' + t.replace(/'/g,"\\'") + '\',this)" title="Aggiungi alla banca italiana">+</button></span>'; }).join(' ');
              transEl.innerHTML = '→ ' + chips;
              transEl.style.opacity = '1';
            }
          } else {
            var transEl = newBox.querySelector('.wbx-trans'); if (transEl) transEl.style.display = 'none';
          }
          // Synonyms
          if (syns && syns.length) {
            var synsEl = newBox.querySelector('.wbx-syns');
            if (synsEl) synsEl.innerHTML = syns.slice(0, 6).map(function(s){ return '<span data-word="' + s + '">' + s + '</span>'; }).join('');
          }

          newBox.style.opacity = '1';
          if (typeof autoSizeExpandWords === 'function') autoSizeExpandWords();
        } catch(e) {
          var defEl = newBox.querySelector('.wbx-def'); if (defEl) defEl.textContent = 'Dettagli non disponibili.';
          newBox.style.opacity = '1';
        }
      }

      // ── Bookmark: save to "Saved for later" pinned bank ──
      async function bookmarkExpandWord(word, level, pos) {
        var sb = window.sottotitoliSupabase;
        if (!sb) return;
        var r = await sb.auth.getSession();
        if (!r.data?.session) { showWbxToast('⚠️ Accedi per salvare parole'); return; }
        var userId = r.data.session.user.id;
        var lang = window.SOTTOTITOLI_STUDY_LANG || 'en';

        var banks = await SottotitoliData.getWordbanks(lang);
        var targetBank = banks.find(function(b) { return b.name === 'Saved for later'; });
        if (!targetBank) {
          var createRes = await sb.from('user_wordbanks').insert({ user_id: userId, name: 'Saved for later', lang: lang }).select().single();
          if (createRes.error) { console.warn('create bookmark bank:', createRes.error.message); return; }
          targetBank = createRes.data;
        }
        var insertRes = await sb.from('user_wordbank_words').insert({
          wordbank_id: targetBank.id, word: word, pos: pos, usage_count: 1, status: 'learning'
        });
        if (insertRes.error) { console.warn('bookmark word:', insertRes.error.message); return; }
        SottotitoliData.cacheClear();
      }

      function showWbxToast(msg) {
        if (typeof window.showToast === 'function') { window.showToast(msg); return; }
        var t = document.createElement('div');
        t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#131316;color:#fff;font-size:13px;font-weight:700;padding:10px 24px;border-radius:99px;z-index:99999;opacity:0;transition:opacity .3s;pointer-events:none;font-family:var(--font-body);box-shadow:0 8px 24px rgba(0,0,0,.4)';
        t.textContent = msg;
        document.body.appendChild(t);
        requestAnimationFrame(function(){ t.style.opacity = '1'; });
        setTimeout(function(){ t.style.opacity = '0'; setTimeout(function(){ t.remove(); }, 300); }, 2000);
      }

      // Expose global
      window.selectExpandWord = selectExpandWord;
      window.renderExpandSuggestions = renderExpandSuggestions;
      window.renderExpandQuickChips = renderExpandQuickChips;
      window.renderExpandStats = renderExpandStats;
      window.saveExpandWord = saveExpandWord;
      window.openExpandWordDetail = openExpandWordDetail;
      window.showToastMsg = showWbxToast;

      // ── Save Italian translation word to pinned Italian word bank ──
      window.saveItalianWordToBank = async function(word, btn) {
        if (btn.classList.contains('saved')) return;
        btn.classList.add('saved');
        btn.textContent = '✓';
        var sb = window.sottotitoliSupabase;
        if (sb) {
          try {
            var r = await sb.auth.getSession();
            if (r.data?.session) {
              var userId = r.data.session.user.id;
              // Find or create "Italian Vocabulary Builder" bank
              var { data: banks } = await sb.from('user_wordbanks').select('id,name').eq('user_id', userId).eq('lang', 'it');
              var targetBank = (banks||[]).find(function(b){ return b.name === 'Italian Vocabulary Builder'; });
              if (!targetBank) {
                var createRes = await sb.from('user_wordbanks').insert({ user_id: userId, name: 'Italian Vocabulary Builder', lang: 'it' }).select().single();
                if (createRes.data) targetBank = createRes.data;
              }
              if (targetBank) {
                // user_wordbank_words only has: wordbank_id, word, pos, usage_count, last_used, created_at, status
                var itPos = (window.S8T_IT_LEXICON && window.S8T_IT_LEXICON.getPOS(word, 'it')) || null;
                await sb.from('user_wordbank_words').upsert({
                  wordbank_id: targetBank.id, word: word, pos: itPos, usage_count: 1
                }, { onConflict: 'wordbank_id,word' });
              }
            }
          } catch(e) {}
        }
        // Also keep localStorage for offline/immediate feedback
        var bankKey = 'sottotitoli_wb_it_pinned';
        var bank = JSON.parse(localStorage.getItem(bankKey) || '{"name":"Italian Vocabulary Builder","words":[]}');
        if (bank.words.indexOf(word) === -1) {
          bank.words.push(word);
          localStorage.setItem(bankKey, JSON.stringify(bank));
        }
        showWbxToast('📥 ' + word + ' salvato in Italian Vocabulary Builder');
      };

      // ── Bank selector: populate "Save to" dropdown ──
      // Groups mirror the Word Banks folders view: Pinned / Smart / Yours,
      // plus a "Create word bank as target folder" action at the bottom.
      async function loadBankSelector(lang) {
        lang = lang || 'en';
        var isIt = lang === 'it';
        var dd = document.getElementById(isIt ? 'wbxSaveTargetIt' : 'wbxSaveTarget');
        var menu = document.getElementById(isIt ? 'wbxSaveTargetItMenu' : 'wbxSaveTargetMenu');
        if (!dd || !menu) return;
        var sb = window.sottotitoliSupabase;
        var defaultLabel = isIt ? 'Italian Vocabulary Builder (default)' : 'English Vocabulary Builder (default)';

        // Groups mirror the Word Banks folders view: Pinned / Smart / Yours
        var groups = [
          { label: 'Pinned', items: [
            { v: '', t: defaultLabel },
            { v: 'saved_from_sessions', t: 'Saved from sessions' },
            { v: isIt ? 'it_vocab_builder' : 'vocab_builder_en', t: isIt ? 'Italian Vocabulary Builder' : 'English Vocabulary Builder' }
          ] },
          { label: 'Smart', items: [
            { v: 'goal_next_step', t: 'Next Step For Your Goal' },
            { v: 'build_from_known', t: 'Build From What You Know' },
            { v: 'activate_recognized', t: 'Activate What You Recognize' },
            { v: 'upcoming_useful_vocab', t: 'Goal-Based Upcoming Vocab' },
            { v: 'upcoming_session_driven', t: 'Session-Detected Themes' },
            { v: 'upcoming_roadmap', t: 'Your Learning Roadmap' }
          ] }
        ];
        var custom = [];
        try { custom = custom.concat(JSON.parse(localStorage.getItem('sottotitoli_wb_custom_' + lang) || '[]')); } catch(e) {}
        if (sb) {
          try {
            var r = await sb.auth.getSession();
            if (r.data && r.data.session) {
              var userId = r.data.session.user.id;
              var { data: banks } = await sb.from('user_wordbanks')
                .select('id,name').eq('user_id', userId).eq('lang', lang).order('name');
              if (banks && banks.length) {
                var systemNames = ['Saved from sessions','Build From Known','New Words','Saved For Later','All Looked-Up Words','English Vocabulary Builder','Italian Vocabulary Builder'];
                banks.forEach(function(b){
                  if (systemNames.indexOf(b.name) === -1) custom.push({ id: b.id, name: b.name });
                });
              }
            }
          } catch(e) { /* silently skip */ }
        }
        var seen = {};
        var unique = [];
        custom.forEach(function(b){ if (b && b.id && !seen[b.id]) { seen[b.id] = true; unique.push(b); } });
        if (unique.length) {
          groups.push({ label: 'Yours', items: unique.map(function(b){ return { v: b.id, t: '📦 ' + b.name }; }) });
        }
        groups.push(null); // separator before the create action

        var html = '';
        groups.forEach(function(g){
          if (!g) { html += '<div class="wbx-save-dd-sep"></div>'; return; }
          html += '<div class="wbx-save-dd-group">' + g.label + '</div>';
          g.items.forEach(function(it){
            html += '<div class="wbx-save-dd-item" data-value="' + it.v + '" title="' + String(it.t).replace(/"/g, '&quot;') + '">' + it.t + '</div>';
          });
        });
        // Create action (distinct colour, legible on every theme)
        html += '<div class="wbx-save-dd-item create" data-value="__create__">＋ Create word bank as target folder</div>';
        menu.innerHTML = html;

        // Delegated pick on the menu (no inline onclick escaping needed)
        menu.onclick = function(ev){
          var it = ev.target.closest ? ev.target.closest('.wbx-save-dd-item') : null;
          if (!it) return;
          if (it.getAttribute('data-value') === '__create__') wbxSaveDdPick('', true);
          else wbxSaveDdPick(it.getAttribute('data-value') || '', false);
        };

        // Restore previous selection (unless it was the create placeholder)
        var saved = localStorage.getItem('wbx-save-target-' + lang);
        if (!saved || saved === '__create__') saved = '';
        wbxSetSaveTarget(saved, true);
      }

      // ── Custom "Save to" dropdown behaviour ──
      // Resolves the dropdown that belongs to the currently-active tab (English vs Italian).
      function wbxSaveDdEls() {
        var isIt = !document.querySelector('[data-subtab="wb-expand"].active');
        return isIt
          ? { dd: document.getElementById('wbxSaveTargetIt'), menu: document.getElementById('wbxSaveTargetItMenu'), lbl: document.getElementById('wbxSaveTargetItLabel'), lang: 'it' }
          : { dd: document.getElementById('wbxSaveTarget'), menu: document.getElementById('wbxSaveTargetMenu'), lbl: document.getElementById('wbxSaveTargetLabel'), lang: 'en' };
      }
      function wbxSetSaveTarget(value, silent) {
        var els = wbxSaveDdEls();
        var dd = els.dd, lbl = els.lbl;
        if (!dd) return;
        value = value || '';
        dd.dataset.value = value;
        var label = '';
        var items = document.querySelectorAll('#' + dd.id + 'Menu .wbx-save-dd-item');
        for (var i = 0; i < items.length; i++) {
          var it = items[i];
          var on = (it.getAttribute('data-value') || '') === value;
          it.classList.toggle('sel', on);
          if (on) label = it.textContent;
        }
        if (lbl) {
          lbl.textContent = label || (value ? value : '…');
          dd.title = label || '';
        }
        if (!silent) {
          localStorage.setItem('wbx-save-target-' + els.lang, value);
        }
      }

      function wbxSaveDdClose() {
        var els = wbxSaveDdEls();
        if (els.menu) els.menu.style.display = 'none';
        document.removeEventListener('click', wbxSaveDdDocClick);
        document.removeEventListener('keydown', wbxSaveDdDocKey);
      }
      function wbxSaveDdDocClick(e) {
        var els = wbxSaveDdEls();
        if (els.dd && e && els.dd.contains(e.target)) return;
        wbxSaveDdClose();
      }
      function wbxSaveDdDocKey(e) {
        if (e && e.key === 'Escape') wbxSaveDdClose();
      }
      window.wbxSaveDdClick = function(e) {
        var els = wbxSaveDdEls();
        if (!els.menu) return;
        // Clicks on menu rows are handled by menu.onclick (pick + close) — don't re-toggle here.
        if (e && els.menu.contains(e.target)) return;
        if (els.menu.style.display === 'none') {
          els.menu.style.display = 'block';
          document.addEventListener('click', wbxSaveDdDocClick);
          document.addEventListener('keydown', wbxSaveDdDocKey);
        } else {
          wbxSaveDdClose();
        }
      };
      window.wbxSaveDdPick = function(value, isCreate) {
        wbxSaveDdClose();
        var lang = document.querySelector('[data-subtab="wb-expand"].active') ? 'en' : 'it';
        if (isCreate) {
          // Revert to previous target, then open the create flow
          var prev = localStorage.getItem('wbx-save-target-' + lang);
          wbxSetSaveTarget(prev && prev !== '__create__' ? prev : '', true);
          createBankFromSelector();
          return;
        }
        localStorage.setItem('wbx-save-target-' + lang, value || '');
        wbxSetSaveTarget(value || '', true);
      };
      // Kept for backwards-compat (the old native <select> fired this on change).
      window.onSaveTargetChange = function() {};

      window.createBankFromSelector = function() {
        appPrompt('Nome della nuova banca:', async function(name){
          if (!name || !name.trim()) return;
          var lang = document.querySelector('[data-subtab="wb-expand"].active') ? 'en' : 'it';
          var sb = window.sottotitoliSupabase;
          if (sb) {
            try {
              var r = await sb.auth.getSession();
              if (r.data?.session) {
                var { data: bank } = await sb.from('user_wordbanks')
                  .insert({ user_id: r.data.session.user.id, name: name.trim(), lang: lang })
                  .select().single();
                if (bank) {
                  loadBankSelector(lang);
                  wbxSetSaveTarget(bank.id, false);
                  showWbxToast('✓ Banca "' + name.trim() + '" creata');
                  return;
                }
              }
            } catch(e) {}
          }
          // Fallback: store in localStorage
          var banks = JSON.parse(localStorage.getItem('sottotitoli_wb_custom_' + lang) || '[]');
          var newBank = { id: 'local_' + Date.now(), name: name.trim(), lang: lang };
          banks.push(newBank);
          localStorage.setItem('sottotitoli_wb_custom_' + lang, JSON.stringify(banks));
          loadBankSelector(lang);
          wbxSetSaveTarget(newBank.id, false);
          showWbxToast('✓ Banca "' + name.trim() + '" creata (locale)');
        }, 'Nuova banca', '📚', 'Nome banca…');
      };

      // ── Get current save target bank ID ──
      function getSaveTargetBank(lang) {
        var dd = document.getElementById(lang === 'it' ? 'wbxSaveTargetIt' : 'wbxSaveTarget');
        if (dd && dd.dataset.value) return dd.dataset.value;
        return null; // null = use default "Build From Known"
      }

      // Expose
      window.loadBankSelector = loadBankSelector;
      window.getSaveTargetBank = getSaveTargetBank;

      // ============================================
      // ITALIAN Vocabulary Builder
      // ============================================

      // Italian scheme cycling
      (function(){
        var schemes = ['2','4','5','6','7'];
        var itIdx = schemes.indexOf(localStorage.getItem('wbx-it-accent-scheme')||'2');
        if (itIdx < 0) itIdx = 0;
        if (itIdx < 0 || itIdx >= schemes.length) itIdx = 0;
        var itMode = localStorage.getItem('wbx-it-mode') || 'none';
        var itContainer = document.getElementById('sub-wb-expand-it');
        function applyItScheme() {
          if (itContainer) { itContainer.setAttribute('data-wb-scheme', schemes[itIdx]); itContainer.setAttribute('data-wb-accent', itMode); }
          var numEl = document.getElementById('wbxItSchemeNum');
          if (numEl) numEl.textContent = (itIdx + 1); // renumbered 1-5 (schemes are 2,4,5,6,7)
          var abtn = document.getElementById('wbxItAccentBtn');
          if (abtn) abtn.innerHTML = '<i class="fa-solid fa-palette"></i> ' + (itIdx + 1);
        }
        applyItScheme();
        var itAccentBtn = document.getElementById('wbxItAccentBtn');
        if (itAccentBtn) itAccentBtn.addEventListener('click', function(){
          itIdx = (itIdx + 1) % schemes.length;
          localStorage.setItem('wbx-it-accent-scheme', schemes[itIdx]);
          applyItScheme();
        });
        document.querySelectorAll('#sub-wb-expand-it [data-wbx-it-mode]').forEach(function(btn){
          btn.addEventListener('click', function(){
            document.querySelectorAll('#sub-wb-expand-it [data-wbx-it-mode]').forEach(function(b){ b.classList.remove('active'); });
            btn.classList.add('active');
            itMode = btn.getAttribute('data-wbx-it-mode');
            localStorage.setItem('wbx-it-mode', itMode);
            applyItScheme();
          });
        });
      })();

      // Italian definition (Wiktionary mediawiki API)
      async function fetchItalianDefinition(word) {
        try {
          var apiUrl = 'https://it.wiktionary.org/w/api.php?action=query&prop=extracts&explaintext=1&titles=' + encodeURIComponent(word) + '&format=json&origin=*';
          var resp = await fetch(apiUrl);
          if (!resp.ok) return null;
          var data = await resp.json();
          if (!data || !data.query || !data.query.pages) return null;
          var pages = data.query.pages;
          var pageId = Object.keys(pages)[0];
          if (pageId === '-1') return null;
          var extract = pages[pageId].extract || '';
          if (!extract.trim()) return null;

          // Parse POS from === Sostantivo === / === Verbo === etc.
          var posMatch = extract.match(/=== ([A-Za-z]+) ===/);
          var pos = posMatch ? posMatch[1].toLowerCase() : '';

          // Parse definition: find the first real definition line after the POS header
          var lines = extract.split('\n');
          var definition = '';
          var inDefSection = false;
          var skippedHeadword = false;
          var wLower = word.toLowerCase();
          for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (!line) continue;
            if (line.indexOf('===') === 0) { inDefSection = true; skippedHeadword = false; continue; }
            if (inDefSection && line.indexOf('==') === 0) break;
            if (inDefSection) {
              var clean = line.replace(/\([^)]*approfondimento[^)]*\)/gi, '').replace(/\s+/g, ' ').trim();
              // Skip headword line (starts with the word itself + grammar like "m sing", "f pl", "v")
              if (!skippedHeadword && (clean.toLowerCase().indexOf(wLower) === 0 || /^[a-zà-ù]+\s+(m|f|v|sing|pl|inv)/i.test(clean))) {
                skippedHeadword = true;
                continue;
              }
              if (clean.length > 8) { definition = clean; break; }
            }
          }
          if (!definition) definition = extract.replace(/\n/g, ' ').replace(/\s+/g, ' ').substring(0, 200).trim();

          return { definition: definition, pos: pos };
        } catch(e) { return null; }
      }

      // Italian to English translation (MyMemory)
      async function fetchItalianTranslationEN(word) {
        try {
          var resp = await fetch('https://api.mymemory.translated.net/get?q=' + encodeURIComponent(word) + '&langpair=it|en');
          if (!resp.ok) return null;
          var data = await resp.json();
          if (data.responseData && data.responseData.translatedText) {
            var txt = data.responseData.translatedText;
            return txt.split(/[,;]/).map(function(t){ return t.trim(); }).filter(function(t){ return t && t.toLowerCase() !== word.toLowerCase(); });
          }
          return null;
        } catch(e) { return null; }
      }

      // ── Italian related words: KELLY + curated prefix families (real Italian) ──
      function findItalianRelated(queryWord) {
        var lex = window.S8T_IT_LEXICON;
        if (!lex || !lex.relatedItalian) return [];
        return lex.relatedItalian(queryWord, 15);
      }

      // Render Italian search results
      window.renderItExpandSuggestions = async function() {
        var inp = document.getElementById('wbItExpandSearch');
        var results = document.getElementById('wbItExpandResults');
        if (!inp || !results) return;
        var query = inp.value.trim();
        if (!query || query.length < 2) return;
        results.innerHTML = '<div style="text-align:center;padding:30px 20px;color:var(--text-faint)"><i class="fa-solid fa-spinner fa-spin"></i> Cercando...</div>';

        var _a = await Promise.allSettled([
          fetchItalianDefinition(query),
          fetchItalianTranslationEN(query)
        ]);
        var defData = _a[0].status === 'fulfilled' ? _a[0].value : null;
        var transData = _a[1].status === 'fulfilled' ? _a[1].value : null;
        var related = findItalianRelated(query);

        // CEFR chain for Italian: local IT lexicon → suffix rules → length (no more flat B1)
        var lex = window.S8T_IT_LEXICON;
        var wordLevel = lex ? lex.getCEFR(query, 'it') : 'B1';
        var defText = defData && defData.definition ? defData.definition : '—';
        // POS chain for Italian: Wiktionary parse → IT lexicon suffix rules → '—'
        var posLabel = defData && defData.pos ? defData.pos.toUpperCase() : (lex ? lex.getPOS(query, 'it') : '—');
        var transText = transData && transData.length ? transData.slice(0,3).join(' · ') : '—';

        var exactCardHtml = window.wbxCard({
          word: query, cefr: wordLevel, pos: posLabel,
          ipa: (defData && defData.pos ? defData.pos : ''),
          def: defText, trans: '→ ' + transText, transOp: 1, syns: '',
          lang: 'it', exact: true, dismissible: false, saveTitle: 'Salva'
        });

        var cardsHtml = '';
        related.forEach(function(r) {
          var rPosLabel = r.pos || '—';
          if (rPosLabel === '—' && lex) rPosLabel = lex.getPOS(r.word, 'it');
          cardsHtml += window.wbxCard({
            word: r.word, cefr: r.level, pos: rPosLabel, ipa: '—',
            def: 'Caricamento...', trans: '', transOp: 0, syns: '',
            lang: 'it', exact: false, dismissible: false, saveTitle: 'Salva'
          });
        });

        results.innerHTML = '<div class="wbx-grid">' + exactCardHtml + cardsHtml + '</div>';
        if (window.WBToken) window.WBToken.refreshAll();

        // Check bank membership for Italian builder
        enrichBankStatus('#wbItExpandResults');

        var boxes = document.querySelectorAll('#wbItExpandResults .wbx-box:not(.wbx-exact)');
        boxes.forEach(function(box, i) {
          setTimeout(async function() {
            var w = box.getAttribute('data-word'); if (!w) return;
            var _d = await fetchItalianDefinition(w);
            var _t = await fetchItalianTranslationEN(w);
            var defEl = box.querySelector('.wbx-def');
            var transEl = box.querySelector('.wbx-trans');
            if (defEl && _d && _d.definition) defEl.textContent = _d.definition;
            else if (defEl) defEl.textContent = '—';
            if (transEl && _t && _t.length) { transEl.innerHTML = '→ ' + _t.slice(0,3).join(' · '); transEl.style.opacity = '1'; }
          }, i * 200);
        });

        var itContainer2 = document.getElementById('sub-wb-expand-it');
        if (itContainer2) {
          itContainer2.setAttribute('data-wb-scheme', localStorage.getItem('wbx-it-accent-scheme') || '1');
          itContainer2.setAttribute('data-wb-accent', localStorage.getItem('wbx-it-mode') || 'none');
        }
      };


      // ═══ RENDER: Insights Overview ───
      async function renderInsightsOverview() {
        var s = currentStats() || {};
        var state = getInsightState();
        var totalSessions = s.totalSessions || 0;
        var totalMinutes = s.totalMinutes || 0;
        var avgWpm = Math.round(s.avgWpm || 0);
        var avgLexDiv = s.avgLexDiv || 0;

        // Compute habits from real session data
        var habit = { activeDays: 0, dailyAverageMinutes: 0, preferredTimeLabel: '', topDays: [], sessionsPerWeek: 0 };
        var growth = { monthlyWpmGrowthPct: 0, monthlyMinutesGrowthPct: 0 };
        try {
          var sessions = await fetchRecentSessionsForHero();
          if (sessions && sessions.length) {
            habit = computePracticeHabit(sessions);
            growth = computeMonthlyGrowth(sessions);
          }
        } catch(e) { /* use defaults */ }

        var summary = '', confidence = '', next = '';

        if (state.key === 'no_data') {
          summary = 'Non ci sono ancora abbastanza dati per tracciare un profilo significativo.';
          confidence = 'Affidabilità bassa — nessuna sessione completata.';
          next = 'Inizia con qualche sessione breve in giorni diversi per permettere al sistema di rilevare i primi pattern.';
        } else if (state.key === 'early_data') {
          summary = 'Stiamo iniziando a riconoscere le prime tendenze nel tuo modo di parlare, ma il quadro è ancora in formazione.';
          confidence = 'Affidabilità bassa — segnale iniziale basato su dati ancora limitati.';
          next = 'Aggiungi altre sessioni distribuite su più giorni per rendere il feedback più preciso.';
        } else if (state.key === 'growing_data') {
          summary = 'La tua attività recente è sufficiente per mostrare tendenze utili su ritmo, ampiezza del vocabolario e costanza.';
          confidence = 'Affidabilità media — abbastanza stabile per essere utile, ancora in evoluzione.';
          next = 'Concentrati sulla costanza e rivedi l\'area più debole prima che diventi un\'abitudine.';
        } else {
          summary = 'La tua cronologia è ora abbastanza ricca da supportare un\'interpretazione più stabile dei tuoi punti di forza, abitudini e aree di sviluppo.';
          confidence = 'Affidabilità alta — più sessioni permettono un profilo più affidabile.';
          next = 'Usa i segnali qui sotto per lavorare su un\'area debole mantenendo il tuo pattern più forte.';
        }

        // ── Populate DOM ──
        var summaryEl = document.getElementById('insightsOverviewSummary');
        var confidenceEl = document.getElementById('insightsOverviewConfidence');
        var nextEl = document.getElementById('insightsOverviewNext');
        var patternsEl = document.getElementById('insightsOverviewPatterns');

        if (summaryEl) summaryEl.textContent = summary;
        if (confidenceEl) confidenceEl.textContent = confidence;
        if (nextEl) nextEl.textContent = next;

        if (patternsEl) { patternsEl.innerHTML = ''; }
      }
      window.renderInsightsOverview = renderInsightsOverview;

      
      // ── Render Italian Collection ──
      // ── Render Italian Word Bank overview (re-triggers the inline IIFE in #sub-wb-overview-it) ──
      async function renderWordbanksIt() {
        // If the inline loader is available, use it for a full refresh
        if (window._wbItLoadAll) { window._wbItLoadAll(); return; }
        // Fallback: update stats bar directly
        var lang = 'it';
        try {
          var stats = await SottotitoliData.getWordbankStats(lang);
          var statsEl = document.getElementById('wbItStatsBar');
          if (statsEl && stats) {
            statsEl.innerHTML = '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px">'+
              '<div style="background:var(--card);border:1px solid var(--line);padding:14px 16px;border-radius:8px"><span style="font-size:11px;font-weight:700;font-family:\'Manrope\',sans-serif;color:var(--text-soft);text-transform:uppercase;letter-spacing:.05em">Totale parole</span><div style="font-size:22px;font-weight:700;color:var(--text);margin-top:2px">'+(stats.totalWords||0)+'</div></div>'+
              '<div style="background:var(--card);border:1px solid var(--line);padding:14px 16px;border-radius:8px"><span style="font-size:11px;font-weight:700;font-family:\'Manrope\',sans-serif;color:var(--text-soft);text-transform:uppercase;letter-spacing:.05em">In scadenza oggi</span><div style="font-size:22px;font-weight:700;color:'+(stats.dueToday>0?'#E11D48':'var(--text)')+';margin-top:2px">'+(stats.dueToday||0)+'</div></div>'+
              '<div style="background:var(--card);border:1px solid var(--line);padding:14px 16px;border-radius:8px"><span style="font-size:11px;font-weight:700;font-family:\'Manrope\',sans-serif;color:var(--text-soft);text-transform:uppercase;letter-spacing:.05em">Nuove questa settimana</span><div style="font-size:22px;font-weight:700;color:var(--text);margin-top:2px">'+(stats.newThisWeek||0)+'</div></div>'+
              '<div style="background:var(--card);border:1px solid var(--line);padding:14px 16px;border-radius:8px"><span style="font-size:11px;font-weight:700;font-family:\'Manrope\',sans-serif;color:var(--text-soft);text-transform:uppercase;letter-spacing:.05em">Conosciute</span><div style="font-size:22px;font-weight:700;color:var(--text);margin-top:2px">'+(stats.known||0)+'</div></div>'+
              '<div style="background:var(--card);border:1px solid var(--line);padding:14px 16px;border-radius:8px"><span style="font-size:11px;font-weight:700;font-family:\'Manrope\',sans-serif;color:var(--text-soft);text-transform:uppercase;letter-spacing:.05em">In apprendimento</span><div style="font-size:22px;font-weight:700;color:var(--accent-green);margin-top:2px">'+(stats.learning||0)+'</div></div>'+
            '</div>';
          }
        } catch(e) { /* silently skip */ }
      }
      window.renderWordbanksIt = renderWordbanksIt;
      window.renderWordbanks = renderWordbanks;

// ═══ RENDER: Vocabolario Traguardi ───
      function renderVocabTraguardi() {
        var container = document.querySelector('#sub-voc-traguardi');
        if (!container) return;
        var totalWords = cefrBreakdown ? cefrBreakdown.vocabSize : 0;
        var milestones = [
          { label: '100 parole', reached: totalWords >= 100 },
          { label: '500 parole', reached: totalWords >= 500 },
          { label: '1,000 parole', reached: totalWords >= 1000 }
        ];
        var html = '<section class="alt-card-grid"><article class="alt-card"><h3>Traguardi raggiunti</h3><div class="q-row" style="margin-top:10px">';
        milestones.forEach(function(m) {
          if (m.reached) html += '<button type="button" class="q-chip" aria-pressed="false" style="color:var(--green);border-color:var(--green)">' + m.label + '</button>';
        });
        if (!milestones.some(function(m){return m.reached;})) html += '<span style="font-size:13px;color:var(--text-faint)">Nessun traguardo ancora. Continua a parlare!</span>';
        html += '</div></article><article class="alt-card"><h3>In corso</h3><div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">';
        html += '<div style="display:flex;justify-content:space-between;font-size:15px"><span style="color:var(--text-soft)">1,500 parole uniche</span><span style="font-weight:700">' + totalWords + ' / 1,500</span></div>';
        var c1c2 = cefrBreakdown ? (cefrBreakdown.C1 + cefrBreakdown.C2) : 0;
        if (c1c2 > 0) html += '<div style="display:flex;justify-content:space-between;font-size:15px"><span style="color:var(--text-soft)">50 parole C1+</span><span style="font-weight:700;color:' + (c1c2 >= 50 ? 'var(--green)' : 'var(--teal)') + '">' + c1c2 + ' / 50' + (c1c2 >= 50 ? ' ✓' : '') + '</span></div>';
        html += '</div></article></section>';
        html += '<div style="margin-top:14px;padding:20px 24px;background:linear-gradient(135deg,var(--teal-4),rgba(6,182,212,.05));border:1px solid rgba(14,116,144,.15);border-radius:16px;font-size:13px;color:var(--text-soft);line-height:1.6"><p>Il tuo vocabolario conta <strong style="color:var(--teal)">' + totalWords + ' parole uniche</strong>. Ogni sessione arricchisce il tuo lessico.</p></div>';
        container.innerHTML = html;
      }

      // ═══ RENDER: Insights Traguardi ───
      function renderInsightsTraguardi() {
        var container = document.querySelector('#sub-traguardi');
        if (!container) return;
        var s = currentStats();
        if (!s || s.totalSessions === 0) {
          container.innerHTML = '<section class="alt-card-grid"><article class="alt-card"><h3>Traguardi</h3><p style="font-size:15px;color:var(--text-soft)">Completa le tue prime sessioni per sbloccare i traguardi.</p></article></section>';
          return;
        }
        var totalMins = s.totalMinutes || 0;
        var totalHours = Math.round(totalMins / 60);
        var totalWords = s.totalWords || 0;
        var totalSessions = s.totalSessions || 0;
        var milestones = [
          {label:'100 sessioni', cur:totalSessions, target:100},
          {label:'50 ore parlate', cur:totalHours, target:50},
          {label:'1,000 parole uniche', cur:totalWords, target:1000},
          {label:'1,500 parole uniche', cur:totalWords, target:1500}
        ];
        var reachedHtml = '', inProgressHtml = '';
        milestones.forEach(function(m){
          var pct = Math.min(100, Math.round(m.cur / m.target * 100));
          if (m.cur >= m.target) {
            reachedHtml += '<button type="button" class="q-chip" aria-pressed="false" style="color:var(--green);border-color:var(--green)">' + m.label + '</button>';
          } else {
            inProgressHtml += '<div><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px"><span style="font-weight:600">' + m.label + '</span><span style="font-weight:700;color:var(--teal)">' + pct + '%</span></div><div class="prog"><div class="prog-fill teal" style="width:' + pct + '%"></div></div></div>';
          }
        });
        container.innerHTML = '<section class="alt-card-grid"><article class="alt-card"><h3>Traguardi raggiunti</h3><div class="q-row" style="margin-top:10px">' + (reachedHtml || '<span style="font-size:13px;color:var(--text-faint)">Nessun traguardo ancora</span>') + '</div></article><article class="alt-card"><h3>In corso</h3><div style="display:flex;flex-direction:column;gap:10px;margin-top:10px">' + (inProgressHtml || '<span style="font-size:13px;color:var(--text-faint)">Tutti i traguardi raggiunti! 🎉</span>') + '</div></article></section><div style="margin-top:14px;padding:20px 24px;background:linear-gradient(135deg,var(--teal-4),rgba(6,182,212,.05));border:1px solid rgba(14,116,144,.15);border-radius:16px;font-size:13px;color:var(--text-soft);line-height:1.6"><p>Hai completato <strong style="color:var(--teal)">' + totalSessions + ' sessioni</strong> per <strong style="color:var(--teal)">' + totalHours + ' ore</strong> di parlato.</p></div>';
      }

      // ═══ RENDER: Vocabolario ───
      async function renderVocabolario() {
        var lang = window.SOTTOTITOLI_STUDY_LANG || 'en';
        var stats = await SottotitoliData.getVocabularyStats(lang);

        // Also update Panoramica CEFR chart if we have analytics data
        renderPanoramicaCEFR();

        if (!stats) return;

        // CEFR tab: distribution (now handled by CEFR quad, keep for compatibility)
        var cefrContainer = document.querySelector('#vocCefrChart');
        if (cefrContainer && stats.cefrPcts) {
          var cefrOrder = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
          var cefrColors = { A1: 'var(--green)', A2: 'var(--teal)', B1: 'var(--teal-2)', B2: 'var(--teal)', C1: 'var(--amber)', C2: '#8b5cf6' };
          var chtml = '<section class="alt-card-grid"><article class="alt-card"><h3>Distribuzione CEFR</h3><div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">';
          cefrOrder.forEach(function(level) {
            var pct = stats.cefrPcts[level] || 0;
            var color = cefrColors[level] || 'var(--line)';
            chtml += '<div style="display:flex;align-items:center;gap:10px"><span style="width:28px;font-size:13px;font-weight:700;color:' + color + '">' + level + '</span><div style="flex:1;height:6px;border-radius:3px;background:var(--line);overflow:hidden"><div style="height:100%;width:' + pct + '%;background:' + color + ';border-radius:3px"></div></div><span style="font-size:13px;font-weight:600;color:var(--text-soft);min-width:36px">' + pct + '%</span></div>';
          });
          chtml += '</div></article></section>';
          cefrContainer.innerHTML = chtml;
        }

        // Parole tab: top words list
        var paroleContainer = document.querySelector('#sub-voc-parole');
        if (paroleContainer && stats.words && stats.words.length > 0) {
          var phtml = '<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap"><input style="flex:1;max-width:300px;padding:10px 14px;border-radius:10px;border:1.5px solid var(--line);background:var(--bg);color:var(--text);font-size:13px;font-family:inherit;outline:none" placeholder="Cerca parola..." oninput="var v=this.value.toLowerCase();this.closest(\'.subtab-pane\').querySelectorAll(\'.term-row\').forEach(function(r){r.style.display=r.textContent.toLowerCase().includes(v)?\'\':\'none\'})">' +
            '<button type="button" class="q-chip active" aria-pressed="true">Tutte</button>' +
            '<button type="button" class="q-chip" aria-pressed="false">Nouns</button>' +
            '<button type="button" class="q-chip" aria-pressed="false">Verbs</button>' +
            '<button type="button" class="q-chip" aria-pressed="false">Adjectives</button></div>' +
            '<section class="dictionary-list-card"><div class="tbl-head"><span style="flex:2">Parola</span><span style="flex:1;text-align:right">Tipo</span><span style="flex:1;text-align:right">Usi</span><span class="th-action"></span></div>';
          stats.words.forEach(function(w) {
            var posColor = { NOUN: 'var(--teal)', VERB: 'var(--green)', ADJ: 'var(--amber)', ADV: '#8b5cf6' };
            var pc = posColor[w.pos] || 'var(--teal)';
            phtml += '<div class="term-row"><span style="flex:2">' + w.word + '</span>' +
              '<span style="flex:1;text-align:right;font-size:13px;color:var(--text-soft)">' + (w.pos || '') + '</span>' +
              '<span style="flex:1;text-align:right;font-size:13px;color:var(--text-faint)">' + (w.usage_count || 0) + '×</span>' +
              '<span class="tr-action tr-fav" onclick="this.classList.toggle(\'active\')">★</span>' +
              '<span class="tr-action tr-menu" onclick="var dd=this.querySelector(\'.tr-dd\');dd.classList.toggle(\'open\');event.stopPropagation()"><span style="font-weight:700;letter-spacing:1px">•••</span><div class="tr-dd"><button type="button" class="tr-dd-item">Apri</button><button type="button" class="tr-dd-item">Rinomina</button><button type="button" class="tr-dd-item danger">Elimina</button></div></span></div>';
          });
          phtml += '</section>';
          paroleContainer.innerHTML = phtml;
        }
      }

      // ═══ RENDER: Insights tasks ───
      async function renderTasks() {
        var tasks = await SottotitoliData.getTasks();
        var tbody = document.querySelector('#taskTable tbody');
        if (!tbody) return;
        if (!tasks || !tasks.length) {
          tbody.innerHTML = '<tr><td colspan="4" style="padding:12px;text-align:center;color:var(--text-faint)">Nessun compito. Aggiungine uno!</td></tr>';
          return;
        }
        var statusColors = { doing: 'var(--cyan)', todo: 'var(--teal)', done: 'var(--green)' };
        var statusLabels = { doing: 'In corso', todo: 'Da fare', done: 'Completato' };
        var html = '';
        tasks.forEach(function(t) {
          var sc = statusColors[t.status] || 'var(--teal)';
          html += '<tr class="task-row"><td style="padding:8px 10px"><span>' + t.title + '</span></td>' +
            '<td style="padding:8px 10px"><select style="padding:4px 8px;border-radius:8px;border:1px solid var(--line);background:var(--bg);font-size:11px;font-family:var(--font-ui);font-weight:600;color:' + sc + ';cursor:pointer" onchange="var v=this.value;var m={doing:\'var(--amber)\',todo:\'var(--teal)\',done:\'var(--green)\'};this.style.color=m[v];SottotitoliData.updateTask(\'' + t.id + '\',{status:v})">' +
            '<option value="doing" style="color:var(--amber)"' + (t.status === 'doing' ? ' selected' : '') + '>In corso</option>' +
            '<option value="todo" style="color:var(--teal)"' + (t.status === 'todo' ? ' selected' : '') + '>Da fare</option>' +
            '<option value="done" style="color:var(--green)"' + (t.status === 'done' ? ' selected' : '') + '>Completato</option></select></td>' +
            '<td style="padding:8px 10px;font-size:11px;color:var(--text-faint)">' + fmtDate(t.created_at) + '</td>' +
            '<td style="padding:8px 10px"><button class="hv-danger-bg" aria-label="Elimina compito" style="border:none;background:none;color:var(--text-faint);cursor:pointer;font-size:13px;padding:2px 6px;border-radius:6px;transition:all var(--transition)" onclick="SottotitoliData.deleteTask(\'' + t.id + '\').then(function(){renderTasks()})"><svg class="icon" style="width:12px;height:12px"><use href=\'#i-close\'></use></svg></button></td></tr>';
        });
        tbody.innerHTML = html;
      }
      // Make renderTasks globally accessible for addTask/delete
      window.renderTasks = renderTasks;

      // Override addTask in theme-2.js with Supabase version
      window.addTaskSupabase = async function() {
        var inp = document.getElementById('vtNewTaskInput') || document.getElementById('newTaskInput');
        if (!inp) return;
        var v = inp.value.trim();
        if (!v) return;
        var task = await SottotitoliData.addTask(v);
        if (task) {
          inp.value = '';
          var ar = inp.closest('.vtAddRow') || inp.closest('.addRow');
          if (ar) ar.style.display = 'none';
          // Show the Add button again
          var btn = document.getElementById('vtAddTaskBtn');
          if (!btn) btn = ar && ar.previousElementSibling ? ar.previousElementSibling.querySelector('button') : null;
          if (!btn) btn = document.querySelector('#sub-compiti article button');
          if (btn) btn.style.display = 'inline-flex';
          renderTasks();
          if (typeof renderVTTasks === 'function') renderVTTasks();
        }
      };

      // ═══ Save daily minutes target ═══
      window.saveDailyTarget = async function(val) {
        var n = parseInt(val);
        if (!n || n < 1) return;
        var uid = await SottotitoliData.getUserId();
        if (!uid || !window.sottotitoliSupabase) return;
        await window.sottotitoliSupabase.from('user_preferences').upsert({ user_id: uid, daily_minutes_target: n }, { onConflict: 'user_id' });
      };

      // ── "Nuova banca" handler ──
      window.newWordbank = function() {
        var itTab = document.querySelector('[data-subtab="wb-overview-it"][aria-selected="true"]');
        var lang = itTab ? 'it' : (window.SOTTOTITOLI_STUDY_LANG || 'en');
        appPrompt(lang === 'it' ? 'Nome della nuova banca italiana:' : 'Nome della nuova banca:', async function(name){
          if (!name) return;
          name = name.trim();
          if (!name) return;
          try {
            var uid = await SottotitoliData.getUserId();
            if (!uid || !window.sottotitoliSupabase) { appAlert('Devi accedere per creare una banca.', 'Accesso richiesto', '🔒'); return; }
            var { data, error } = await window.sottotitoliSupabase.from('user_wordbanks').insert({ user_id: uid, name: name, lang: lang }).select().single();
            if (error) { appAlert('Errore: ' + error.message, 'Errore', '❌'); return; }
            // Clear cache and refresh the appropriate overview
            if (typeof SottotitoliData.cacheClear === 'function') SottotitoliData.cacheClear();
            appAlert('Banca "' + name + '" creata!', 'Operazione completata', '✅');
            if (lang === 'it') renderWordbanksIt();
            else renderWordbanks();
          } catch(e) { appAlert('Errore nella creazione: ' + e.message, 'Errore', '❌'); }
        }, 'Nuova banca', '📚', lang === 'it' ? 'Nome banca italiana…' : 'Nome banca…');
      };

      // ── Create new Italian wordbank ──
      window.newItalianWordbank = function() {
        appPrompt('Nome della nuova banca italiana:', async function(name){
          if (!name) return;
          name = name.trim();
          if (!name) return;
          try {
            var uid = await SottotitoliData.getUserId();
            if (!uid || !window.sottotitoliSupabase) { appAlert('Devi accedere per creare una banca.', 'Accesso richiesto', '🔒'); return; }
            var { data, error } = await window.sottotitoliSupabase.from('user_wordbanks').insert({ user_id: uid, name: name, lang: 'it' }).select().single();
            if (error) { appAlert('Errore: ' + error.message, 'Errore', '❌'); return; }
            appAlert('Banca italiana "' + name + '" creata!', 'Operazione completata', '✅');
            SottotitoliData.cacheClear();
            renderWordbanksIt();
          } catch(e) { appAlert('Errore nella creazione: ' + e.message, 'Errore', '❌'); }
        }, 'Nuova banca italiana', '🇮🇹', 'Nome banca italiana…');
      };

      // ── Three-dot menu toggle ──
      window.wbToggleMenu = function(btn) {
        var dd = btn.nextElementSibling;
        if (!dd) return;
        // Close all other menus first
        document.querySelectorAll('.wb-menu-dropdown').forEach(function(m){ if (m !== dd) m.style.display = 'none'; });
        dd.style.display = dd.style.display === 'block' ? 'none' : 'block';
      };

      // ── Rename bank ──
      window.wbRenameBank = function(bankId, currentName) {
        appPrompt('Nuovo nome della banca:', async function(newName){
          if (!newName || !newName.trim()) return;
          newName = newName.trim();
          try {
            var sb = window.sottotitoliSupabase;
            if (!sb) return;
            var { error } = await sb.from('user_wordbanks').update({ name: newName }).eq('id', bankId);
            if (error) { appAlert('Errore: ' + error.message, 'Errore', '❌'); return; }
            SottotitoliData.cacheClear();
            renderWordbanks();
          } catch(e) { appAlert('Errore: ' + e.message, 'Errore', '❌'); }
        }, 'Rinomina banca', '✏️', 'Nuovo nome…', currentName);
      };

      // ── Duplicate bank ──
      window.wbDuplicateBank = async function(bankId) {
        try {
          var sb = window.sottotitoliSupabase;
          if (!sb) return;
          var lang = window.SOTTOTITOLI_STUDY_LANG || 'en';
          // Fetch the original bank
          var { data: bank, error: fErr } = await sb.from('user_wordbanks').select('*').eq('id', bankId).single();
          if (fErr || !bank) { appAlert('Banca non trovata.', 'Banca non trovata', '⚠️'); return; }
          // Create copy
          var { data: copy, error: cErr } = await sb.from('user_wordbanks').insert({
            user_id: bank.user_id, name: (bank.name || 'Copy') + ' (copia)', lang: lang,
            description: bank.description
          }).select().single();
          if (cErr) { appAlert('Errore: ' + cErr.message, 'Errore', '❌'); return; }
          // Copy words
          var { data: words } = await sb.from('user_wordbank_words').select('*').eq('wordbank_id', bankId);
          if (words && words.length) {
            var inserts = words.map(function(w){ return { wordbank_id: copy.id, word: w.word, pos: w.pos, cefr_level: w.cefr_level, user_id: bank.user_id, status: w.status, usage_count: w.usage_count }; });
            await sb.from('user_wordbank_words').insert(inserts);
          }
          appAlert('Banca "' + bank.name + '" duplicata!', 'Operazione completata', '📋');
          SottotitoliData.cacheClear();
          renderWordbanks();
        } catch(e) { appAlert('Errore: ' + e.message, 'Errore', '❌'); }
      };

      // ── Generic styled modal — replaces native alert() / confirm() / prompt() ──
      window._appModal = { mode: null, cb: null };
      function appModalOpen(opts) {
        opts = opts || {};
        window._appModal = { mode: opts.mode || 'alert', cb: opts.onOk || opts.onYes || null };
        var t = document.getElementById('appModalTitle'); if (t) t.textContent = opts.title || 'Sottotitoli';
        var m = document.getElementById('appModalMsg'); if (m) m.textContent = opts.msg || '';
        var i = document.getElementById('appModalIcon'); if (i) i.textContent = opts.icon || 'ℹ️';
        var inputWrap = document.getElementById('appModalInputWrap');
        var input = document.getElementById('appModalInput');
        var cancel = document.getElementById('appModalCancel');
        var okBtn = document.getElementById('appModalOkBtn');
        if (inputWrap) inputWrap.style.display = opts.mode === 'prompt' ? 'block' : 'none';
        if (input) { input.value = opts.value || ''; if (opts.placeholder) input.placeholder = opts.placeholder; }
        if (cancel) cancel.style.display = opts.mode === 'alert' ? 'none' : '';
        if (okBtn) {
          okBtn.textContent = opts.okLabel || (opts.mode === 'confirm' ? 'Conferma' : 'OK');
          if (opts.danger) { okBtn.style.background = '#ef4444'; okBtn.style.color = '#fff'; }
          else { okBtn.style.background = 'var(--cyan)'; okBtn.style.color = 'var(--chip-active-text,#fff)'; }
        }
        var o = document.getElementById('appModalOverlay'); if (o) o.style.display = 'flex';
        if (opts.mode === 'prompt' && input) setTimeout(function(){ input.focus(); input.select(); }, 30);
      }
      window.appAlert = function(msg, title, icon) { appModalOpen({ mode: 'alert', msg: msg, title: title || 'Sottotitoli', icon: icon || 'ℹ️', okLabel: 'OK' }); };
      window.appConfirm = function(msg, onYes, title, icon) { appModalOpen({ mode: 'confirm', msg: msg, onYes: onYes, title: title || 'Conferma', icon: icon || '❓', okLabel: 'Conferma' }); };
      window.appPrompt = function(msg, onOk, title, icon, placeholder, value) { appModalOpen({ mode: 'prompt', msg: msg, onOk: onOk, title: title || 'Input', icon: icon || '✏️', okLabel: 'OK', placeholder: placeholder || '', value: value || '' }); };
      window.appModalClose = function() {
        var o = document.getElementById('appModalOverlay'); if (o) o.style.display = 'none';
        window._appModal = { mode: null, cb: null };
      };
      window.appModalOk = function() {
        var m = window._appModal; var cb = m.cb;
        var val = '';
        if (m.mode === 'prompt') val = (document.getElementById('appModalInput') || {}).value || '';
        var o = document.getElementById('appModalOverlay'); if (o) o.style.display = 'none';
        window._appModal = { mode: null, cb: null };
        if (cb) { if (m.mode === 'prompt') cb(val); else cb(); }
      };
      // Esc closes the modal
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') { var o = document.getElementById('appModalOverlay'); if (o && o.style.display === 'flex') appModalClose(); }
      });

      // ── Delete bank (styled confirm + animated card removal) ──
      window.wbDeleteBank = function(bankId, name) {
        appConfirm('Eliminare la banca "' + name + '" e tutte le sue parole? Questa azione non può essere annullata.', function(){ doWbDeleteBank(bankId); }, 'Elimina banca', '🗑️');
      };
      async function doWbDeleteBank(bankId) {
        try {
          var sb = window.sottotitoliSupabase;
          if (!sb) return;
          // Delete words first, then the bank
          await sb.from('user_wordbank_words').delete().eq('wordbank_id', bankId);
          var { error } = await sb.from('user_wordbanks').delete().eq('id', bankId);
          if (error) { appAlert('Errore: ' + error.message, 'Errore', '❌'); return; }
          SottotitoliData.cacheClear();
          // Animate the box out in place — no full-grid refresh / no jump to top.
          ['wbFoldersGrid','wbFoldersGridEn','wbFoldersGridIt'].forEach(function(gid){
            var g = document.getElementById(gid);
            if (!g) return;
            var card = g.querySelector('.wbf-folder[data-bank-id="' + bankId + '"]');
            if (!card) return;
            card.classList.add('wbf-leaving');
            setTimeout(function(){ if (card.parentNode) card.parentNode.removeChild(card); }, 400);
          });
        } catch(e) { appAlert('Errore: ' + e.message, 'Errore', '❌'); }
      }

      // ── Close dropdowns when clicking elsewhere ──
      document.addEventListener('click', function(e) {
        if (!e.target.closest('.wb-card-menu')) {
          document.querySelectorAll('.wb-menu-dropdown').forEach(function(m){ m.style.display = 'none'; });
        }
      });


      function clearMockContent() {
        // Vocabolario: remove mockup variation articles
        var vocPanel = document.getElementById('pnl-vocabulary-builder');
        if (vocPanel) {
          var mockArticles = vocPanel.querySelectorAll('.alt-card');
          mockArticles.forEach(function(a) {
            var h3 = a.querySelector('h3');
            if (!h3) return;
            var t = h3.textContent;
            if (t.indexOf('Stato attuale') !== -1 || t.indexOf('Prossimi Passi') !== -1 || t.indexOf('Panoramica · Variazioni') !== -1 || t.indexOf('Vocabolario · Riepilogo') !== -1 || t.indexOf('Vocabolario · Vista Unica') !== -1 || t.indexOf('Parole C1') !== -1 || t.indexOf('Completati di recente') !== -1 || t.indexOf('Abitudini') !== -1) {
              a.style.display = 'none';
            }
          });
          // Also hide the teal gradient motivational divs (they have mock data)
          var gradDivs = vocPanel.querySelectorAll('[style*="linear-gradient"]');
          gradDivs.forEach(function(d) {
            if (d.textContent.indexOf('Stai costruendo') !== -1 && d.textContent.indexOf('mattone') !== -1) {
              d.style.display = 'none';
            }
          });
        }
        // Learning Strategy: hide mock "Completati di recente" section
        var insPanel = document.getElementById('pnl-grammar-hub');
        if (insPanel) {
          var cards = insPanel.querySelectorAll('.alt-card');
          cards.forEach(function(c) {
            var h3 = c.querySelector('h3');
            if (h3 && (h3.textContent.indexOf('Completati di recente') !== -1 || h3.textContent.indexOf('Abitudini') !== -1)) {
              c.style.display = 'none';
            }
          });
          // Clear mock "Livello stimato B2" text
          var levelEl = insPanel.querySelector('[style*="font-size:60px"]');
          if (levelEl && levelEl.textContent.trim() === 'B2') {
            levelEl.textContent = '—';
            var trendP = insPanel.querySelector('.alt-card p');
            if (trendP && trendP.textContent.indexOf('42 ore') !== -1) {
              trendP.textContent = 'Nessuna sessione registrata.';
            }
          }
        }
        // Trascrizioni: clear mock "Preferiti" names
        var trPanel = document.getElementById('pnl-trascrizioni');
        if (trPanel) {
          var favCards = trPanel.querySelectorAll('.alt-card');
          favCards.forEach(function(c) {
            var h3 = c.querySelector('h3');
            if (h3 && (h3.textContent.indexOf('⭐') !== -1 || h3.textContent.indexOf('ℹ️') !== -1)) {
              c.style.display = 'none';
            }
          });
        }
        // Insights Traguardi: hide mock "In corso · Dettaglio" and "Linea Temporale"
        var tragPanel = document.getElementById('sub-traguardi');
        if (tragPanel) {
          var cards = tragPanel.querySelectorAll('.alt-card');
          cards.forEach(function(c) {
            var h3 = c.querySelector('h3');
            if (h3 && (h3.textContent.indexOf('Dettaglio') !== -1 || h3.textContent.indexOf('Linea Temporale') !== -1)) {
              c.style.display = 'none';
            }
          });
        }
      }

      // ── Reveal content BEFORE render calls (prevent total blank-out on render errors) ──
      var mainPanel = document.querySelector('.main-panel');
      if (mainPanel) {
        mainPanel.classList.remove('js-loading');
        mainPanel.classList.add('js-ready');
      }

      // ── Initial render (settingsData already loaded above) ──
      var _sd = window._settingsData;
      renderHero(window._settingsData && window._settingsData.display_name);
      renderHeroCards();
      updateHeroAiWbCount();
      renderMetrics();
      renderWrappedShowcase();
      renderInsightsMetrics();
      renderInsightsTraguardi();
      renderInsightsOverview();
      renderPanoramicaCEFR();
      renderWbOverviewSections();
      renderProfile();
      renderTrascrizioni();
      renderWordbanks();
      renderVocabolario();
      renderVocabTraguardi();
      setTimeout(renderVTTasks, 650);
      setTimeout(renderVTAutoTasks, 700);
      renderTasks();
      renderSettings(_sd);
      renderAIReports();
      loadReportSessions();
      clearMockContent();

      // ── Refresh on tab clicks ──
      var trascrizioniNav = document.querySelector('[data-panel="trascrizioni"]');
      if (trascrizioniNav) {
        trascrizioniNav.addEventListener('click', function () { setTimeout(renderSessions, 100); });
      }
      var reportNav = document.querySelector('[data-panel="report-ai"]');
      if (reportNav) { reportNav.addEventListener('click', function () { setTimeout(renderAIReports, 100); }); }
      var wbNav = document.querySelector('[data-panel="wordbanks"]');
      if (wbNav) { wbNav.addEventListener('click', function () {
        // Opening Word Banks from the sidebar should always land on the Overview
        // subtab (its default view), not a previously-active English/Italiano tab.
        var ovBtn = document.querySelector('#pnl-wordbanks .tab-link[data-subtab="wb-overview-panel"]');
        if (ovBtn && !ovBtn.classList.contains('active')) ovBtn.click();
        setTimeout(function(){ if (window.renderWordbanks) window.renderWordbanks(); }, 100);
        setTimeout(renderWbOverviewSections, 200);
        // Re-trigger wb-anim — they can stay stuck at opacity:0 if the panel was
        // hidden when the animation was due (same fix as the Overview-tab click).
        setTimeout(function(){ var els = document.querySelectorAll('#sub-wb-overview-panel .wb-anim'); els.forEach(function(el){ el.style.animation = 'none'; el.offsetHeight; el.style.animation = ''; }); }, 40);
      }); }
      // ── Wordbank sub-tab click handlers ──
      var wbPanel = document.getElementById('pnl-wordbanks');
      if (wbPanel) {
        wbPanel.querySelectorAll('.tab-link[data-subtab]').forEach(function(tab){
          tab.addEventListener('click', function(){
            var st = this.getAttribute('data-subtab');
            this.parentElement.querySelectorAll('.tab-link').forEach(function(t){ t.classList.remove('active'); t.setAttribute('aria-selected','false'); });
            this.classList.add('active'); this.setAttribute('aria-selected','true');
            wbPanel.querySelectorAll('.subtab-pane').forEach(function(p){ p.classList.remove('active'); });
            var pane = document.getElementById('sub-' + st);
            if (pane) pane.classList.add('active');
          });
        });
      }
      var wbOverviewPanelTab = document.querySelector('[data-subtab="wb-overview-panel"]');
      if (wbOverviewPanelTab) { wbOverviewPanelTab.addEventListener('click', function () { setTimeout(renderWbOverviewSections, 200); /* Re-trigger wb-anim animations — they get stuck at opacity:0 after display:none toggle */ setTimeout(function(){ var els = document.querySelectorAll('#sub-wb-overview-panel .wb-anim'); els.forEach(function(el){ el.style.animation = 'none'; el.offsetHeight; el.style.animation = ''; }); }, 30); }); }
      var wbItTab = document.querySelector('[data-subtab="wb-overview-it"]');
      if (wbItTab) { wbItTab.addEventListener('click', function () { setTimeout(renderWordbanksIt, 150); }); }
      var wbEnTab = document.querySelector('[data-subtab="wb-overview"]');
      if (wbEnTab) { wbEnTab.addEventListener('click', function () { setTimeout(function(){ wbRenderActive(); }, 150); }); }
      var wbExpandTab = document.querySelector('[data-subtab="wb-expand"]');
      if (wbExpandTab) { wbExpandTab.addEventListener('click', function () { setTimeout(function(){ renderExpandQuickChips(); loadBankSelector('en'); }, 150); }); }
      var wbExpandItTab = document.querySelector('[data-subtab="wb-expand-it"]');
      if (wbExpandItTab) { wbExpandItTab.addEventListener('click', function () { setTimeout(function(){ loadBankSelector('it'); }, 150); }); }
      var vocNav = document.querySelector('[data-panel="vocabulary-builder"]');
      if (vocNav) { vocNav.addEventListener('click', function () { setTimeout(renderVocabolario, 100); }); }
      var insNav = document.querySelector('[data-panel="grammar-hub"]');
      if (insNav) { insNav.addEventListener('click', function () { setTimeout(renderTasks, 100); setTimeout(renderInsightsOverview, 150); }); }
      var profNav = document.querySelector('[data-panel="profilo"]');
      if (profNav) { profNav.addEventListener('click', function () { setTimeout(renderProfile, 100); setTimeout(loadProfileAvatar, 200); }); }
      var impNav = document.querySelector('[data-panel="impostazioni"]');
      if (impNav) { impNav.addEventListener('click', async function () {
        // Load localStorage first (instant, always works)
        var localSettings = null;
        try { localSettings = JSON.parse(localStorage.getItem('sottotitoli-settings') || 'null'); } catch(e) {}
        // Immediately populate with localStorage so fields are never empty
        if (localSettings) {
          window._settingsData = localSettings;
          renderSettings(localSettings);
        }
        // Then try Supabase for fresher data
        if (typeof SottotitoliData !== 'undefined' && SottotitoliData.loadSettings) {
          try {
            var sd = await SottotitoliData.loadSettings();
            if (sd && (sd.display_name || sd.native_lang || sd.theme)) {
              window._settingsData = sd;
              renderSettings(sd);
            }
          } catch(e) { console.warn('Supabase settings load failed, using localStorage:', e.message); }
        }
      }); }
      // ── Profilo Linguistico subsubtabs (native / target) ──
      document.querySelectorAll('.tab-link[data-plang]').forEach(function(tab){
        tab.addEventListener('click', function(){
          var plang = this.getAttribute('data-plang');
          // Update active tab
          this.parentElement.querySelectorAll('.tab-link').forEach(function(t){ t.classList.remove('active'); t.setAttribute('aria-selected','false'); });
          this.classList.add('active');
          this.setAttribute('aria-selected','true');
          // Show matching pane
          document.querySelectorAll('.plang-pane').forEach(function(p){ p.classList.remove('active'); });
          var pane = document.getElementById('plang-' + plang);
          if (pane) pane.classList.add('active');
        });
      });

      // ── Auto-refresh when switching back from a recording session ──
      document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
          SottotitoliData.cacheClear();
          // Only refresh the currently visible data — no mass re-render
          renderHero(window._settingsData && window._settingsData.display_name);
          renderHeroCards();
          renderMetrics();
          renderWrappedShowcase();
        }
      });
    })();

    // ── Settings save: single handler, no duplicates ──
    // (the old inline saveSettings function is removed — only the 🎯 standalone below handles saves)
