(function(){
  'use strict';

  // ═══ Load onboarding objectives into Obiettivi subtab ═══
  function loadOnboardingObjectives() {
    var stEl = document.getElementById('goalBreveTesto');
    var ltEl = document.getElementById('goalLungoTesto');
    var profEl = document.getElementById('profileProfession');
    var whyEl = document.getElementById('profileWhyEnglish');
    var insProfEl = document.getElementById('insightsProfession');
    var insWhyEl = document.getElementById('insightsWhyEnglish');
    var insLangEl = document.getElementById('insightsSecondLangs');
    var focusEl = document.getElementById('insightsFocusAreas');

    // Try localStorage first (instant)
    var stGoal = '', ltGoal = '', profession = '', whyEnglish = '', difficulties = [];
    try {
      var ob = JSON.parse(localStorage.getItem('sottotitoli_onboarding') || '{}');
      stGoal = ob['short_term_goal'] || '';
      ltGoal = ob['long_term_goal'] || '';
      profession = ob['profession'] || (ob['profession_other'] || '');
      whyEnglish = ob['why_english'] || (ob['why_english_other'] || '');
      difficulties = ob['difficulties'] || [];
    } catch(e) {}

    // Also try Supabase profiles (more permanent + AI-refined data)
    var sb = window.sottotitoliSupabase;
    if (sb) {
      sb.auth.getSession().then(function(r) {
        if (!r.data?.session) return;
        sb.from('profiles').select('goal_primary,native_lang,domain,use_cases,learning_profile').eq('id', r.data.session.user.id).maybeSingle().then(function(res) {
          if (res.data) {
            // Goals — parse from goal_primary (format: "short_term | LT: long_term")
            if (res.data.goal_primary) {
              var parts = res.data.goal_primary.split(' | LT: ');
              if (!stGoal && parts[0]) stGoal = parts[0];
              if (!ltGoal && parts[1]) ltGoal = parts[1];
            }
            // Profession
            if (!profession && res.data.domain) profession = res.data.domain;
            // Why English
            if (!whyEnglish && res.data.use_cases) whyEnglish = res.data.use_cases;
            // Difficulties / focus areas
            if (res.data.learning_profile) {
              var lp = res.data.learning_profile;
              // learning_profile is JSONB — already parsed by Supabase, no JSON.parse needed
              if (typeof lp === 'string') { try { lp = JSON.parse(lp); } catch(e) {} }
              if (Array.isArray(lp) && lp.length > 0) {
                // Normalize: each item may be a string or { title, ... } object
                difficulties = lp.map(function(item) {
                  return typeof item === 'string' ? item : (item.title || item.name || '');
                }).filter(Boolean);
              }
            }
            // Populate Profilo → Lingue
            if (res.data.native_lang) {
              var natEl2 = document.getElementById('profileNativeLang');
              if (natEl2) {
                var langNames = { it: 'Italiano', en: 'English', nl: 'Nederlands', fr: 'Français', de: 'Deutsch', es: 'Español', pt: 'Português', pl: 'Polski' };
                natEl2.textContent = langNames[res.data.native_lang] || res.data.native_lang;
              }
            }
          }
          _populateAll();
        });
      });
    } else {
      _populateAll();
    }

    function _populateAll() {
      // Goals
      if (stEl) { stEl.textContent = stGoal || 'Nessun obiettivo a breve termine impostato. Completa l\'onboarding per definirlo.'; }
      if (ltEl) { ltEl.textContent = ltGoal || 'Nessun obiettivo a lungo termine impostato. Completa l\'onboarding per definirlo.'; }
      // Profilo → Generale
      if (profEl) { profEl.textContent = formatProfession(profession); }
      if (whyEl) { whyEl.textContent = formatWhyEnglish(whyEnglish); }
      if (insProfEl) { insProfEl.textContent = formatProfession(profession); }
      if (insWhyEl) { insWhyEl.textContent = formatWhyEnglish(whyEnglish); }
      // Identità card — extra onboarding fields
      var insNatEl = document.getElementById('insightsNativeLang');
      var insGoalShortEl = document.getElementById('insightsGoalShort');
      var insGoalLongEl = document.getElementById('insightsGoalLong');
      try {
        var obN = JSON.parse(localStorage.getItem('sottotitoli_onboarding') || '{}');
        var langNamesN = { it: 'Italiano', en: 'English', nl: 'Nederlands', fr: 'Français', de: 'Deutsch', es: 'Español', pt: 'Português', pl: 'Polski' };
        var natN = obN['native_lang'] || '';
        if (insNatEl) insNatEl.textContent = natN ? (langNamesN[natN] || natN) : (window._sottotitoliProfile && window._sottotitoliProfile.native_lang ? (langNamesN[window._sottotitoliProfile.native_lang] || window._sottotitoliProfile.native_lang) : '—');
        if (insGoalShortEl) insGoalShortEl.textContent = stGoal || '—';
        if (insGoalLongEl) insGoalLongEl.textContent = ltGoal || '—';
      } catch(e) {}
      // Insights → Overview → Focus areas
      if (focusEl && difficulties.length > 0) {
        // Raw onboarding difficulty keys (e.g. "taking_notes") → readable labels.
        var DIFF_LABELS = {
          it: {
            reading_docs: 'Leggere documenti',
            writing_messages: 'Scrivere messaggi / email',
            taking_notes: 'Prendere appunti',
            understanding_questions: 'Capire le domande',
            speaking_fluently: 'Parlare fluentemente',
            listening_native: 'Capire madrelingua veloci',
            grammar: 'Grammatica',
            pronunciation: 'Pronuncia',
            vocabulary: 'Vocabolario',
            meetings: 'Riunioni / Conference call',
            presentations: 'Presentazioni',
            other_diff: 'Altro'
          },
          en: {
            reading_docs: 'Reading documents',
            writing_messages: 'Writing messages / emails',
            taking_notes: 'Taking notes',
            understanding_questions: 'Understanding questions',
            speaking_fluently: 'Speaking fluently',
            listening_native: 'Understanding fast native speakers',
            grammar: 'Grammar',
            pronunciation: 'Pronunciation',
            vocabulary: 'Vocabulary',
            meetings: 'Meetings / Conference calls',
            presentations: 'Presentations',
            other_diff: 'Other'
          }
        };
        function escTag(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
        function focusLabel(v) {
          if (!v) return '';
          var lang = (window.I18n && I18n.getLang) ? I18n.getLang() : 'it';
          var m = DIFF_LABELS[lang] || DIFF_LABELS.it;
          if (v === 'other_diff') {
            var otherText = '';
            try { var obT = JSON.parse(localStorage.getItem('sottotitoli_onboarding') || '{}'); otherText = obT['difficulties_other'] || ''; } catch(e) {}
            return otherText || m.other_diff;
          }
          if (m[v]) return m[v];
          // Unknown key — prettify snake_case → Title Case
          return String(v).split('_').map(function(w){ return w ? w.charAt(0).toUpperCase() + w.slice(1) : w; }).join(' ');
        }
        var chips = '';
        difficulties.forEach(function(d) {
          var raw = typeof d === 'string' ? d : (d && d.title ? d.title : (d && d.name ? d.name : ''));
          if (!raw) return;
          chips += '<button class=\"q-chip active\" style=\"pointer-events:none\">' + escTag(focusLabel(raw)) + '</button>';
        });
        // Fallback: if all items were objects without titles, show raw data
        if (!chips) {
          chips = difficulties.map(function(d) {
            var raw = typeof d === 'string' ? d : JSON.stringify(d);
            return '<button class=\"q-chip active\" style=\"pointer-events:none\">' + escTag(focusLabel(raw)) + '</button>';
          }).join('');
        }
        focusEl.innerHTML = chips || '<span style=\"font-size:13px;color:var(--text-faint)\">Completa l\'onboarding per vedere le tue aree di miglioramento.</span>';
      }
      // Profilo → Lingue: native language + second languages with proficiency meters
      try {
        var ob = JSON.parse(localStorage.getItem('sottotitoli_onboarding') || '{}');
        var nativeLang = ob['native_lang'] || '';
        var spoken = ob['spoken_languages'] || [];
        var spokenOther = ob['spoken_languages_other'] || '';
        var improve = ob['improve_languages'] || [];

        var langNames = { it: 'Italiano', en: 'English', nl: 'Nederlands', fr: 'Français', de: 'Deutsch', es: 'Español', pt: 'Português', pl: 'Polski' };

        // Native language
        var natEl3 = document.getElementById('profileNativeLang');
        if (natEl3) {
          var nativeName = langNames[nativeLang] || nativeLang || (window._sottotitoliProfile && window._sottotitoliProfile.native_lang ? (langNames[window._sottotitoliProfile.native_lang] || window._sottotitoliProfile.native_lang) : '');
          if (nativeName) {
            natEl3.textContent = nativeName;
          } else {
            natEl3.textContent = '—';
            natEl3.style.color = 'var(--text-muted)';
          }
        }

        // Second languages — exclude native
        var secondLangs = [];
        var allLangs = spoken.slice();
        if (spokenOther) allLangs.push(spokenOther);
        allLangs.forEach(function(l) {
          var code = l.toLowerCase().trim();
          // Map common language names to codes
          var reverseMap = { italian: 'it', italiano: 'it', english: 'en', inglese: 'en', dutch: 'nl', nederlands: 'nl', olandese: 'nl', french: 'fr', français: 'fr', francese: 'fr', german: 'de', deutsch: 'de', tedesco: 'de', spanish: 'es', español: 'es', spagnolo: 'es', portuguese: 'pt', português: 'pt', portoghese: 'pt', polish: 'pl', polski: 'pl', polacco: 'pl' };
          var mappedCode = reverseMap[code] || code;
          if (mappedCode !== nativeLang && !secondLangs.find(function(sl) { return sl.code === mappedCode; })) {
            // Determine proficiency: if in improve list, 40-60%; otherwise 75-90%
            var isImproving = improve.indexOf(mappedCode) !== -1 || improve.indexOf(l) !== -1;
            var pct = 0;
            var isImproving = improve.indexOf(mappedCode) !== -1 || improve.indexOf(l) !== -1;
            // Derive proficiency from session data if available
            var sessionLangKey = mappedCode + '_sessions';
            if (!isImproving) {
              // Spoken languages: check if there are sessions in this language
              var hasSessions = false;
              try {
                var allSess = (window.statsEN && window.statsEN._allSessions) || (window.statsIT && window.statsIT._allSessions) || [];
                hasSessions = allSess.some(function(sess) {
                  var lp = (sess.language_pair || '').toLowerCase();
                  return lp.indexOf(mappedCode) !== -1;
                });
              } catch(e) {}
              pct = hasSessions ? 75 : 0;
            } else {
              pct = 40;
            }
            if (pct === 0) pct = 0; // stays 0, shown as "Dati insufficienti"
            secondLangs.push({ code: mappedCode, name: langNames[mappedCode] || l, pct: pct });
          }
        });

        var slEl = document.getElementById('profileSecondLangs');
        var insSlEl = document.getElementById('insightsSecondLangs');
        var langHTML = '';
        if (secondLangs.length > 0) {
          langHTML = secondLangs.map(function(sl) {
            var barColor = sl.pct >= 75 ? 'var(--accent-green)' : (sl.pct >= 50 ? 'var(--accent-amber)' : 'var(--accent-purple)');
            if (sl.pct === 0) {
              return '<div style="display:flex;align-items:center;gap:10px">' +
                '<span style="font-size:13px;font-weight:600;color:var(--text);min-width:90px">' + sl.name + '</span>' +
                '<span style="font-size:11px;color:var(--text-faint);font-style:italic">Nessun dato — inizia una sessione</span>' +
              '</div>';
            }
            return '<div style="display:flex;align-items:center;gap:10px">' +
              '<span style="font-size:13px;font-weight:600;color:var(--text);min-width:90px">' + sl.name + '</span>' +
              '<div style="flex:1;height:6px;background:var(--line);border-radius:99px;overflow:hidden">' +
                '<div style="height:100%;width:' + sl.pct + '%;background:' + barColor + ';border-radius:99px;transition:width .6s ease"></div>' +
              '</div>' +
              '<span style="font-size:11px;font-weight:600;color:var(--text-muted);min-width:32px;text-align:right">' + sl.pct + '%</span>' +
            '</div>';
          }).join('');
        } else {
          langHTML = '<span style="font-size:13px;color:var(--text-faint)">Nessuna seconda lingua registrata.</span>';
        }
        if (slEl) slEl.innerHTML = secondLangs.length > 0 ? langHTML : '<span style="font-size:13px;color:var(--text-faint)">Nessuna seconda lingua registrata.</span>';
        if (insSlEl) insSlEl.innerHTML = langHTML;
      } catch(e) {}
      // AI Starter Report
      _loadStarterReport();
    }

    // ── Format helpers for Chi sono ──
    function formatProfession(val) {
      if (!val) return '—';
      var map = {
        'software_engineer': 'Ingegnere del software',
        'software_developer': 'Sviluppatore software',
        'designer': 'Designer',
        'teacher': 'Insegnante',
        'student': 'Studente',
        'researcher': 'Ricercatore',
        'manager': 'Manager',
        'freelancer': 'Libero professionista',
        'doctor': 'Medico',
        'other': 'Altro'
      };
      return map[val] || val.replace(/_/g, ' ').replace(/\b\w/g, function(c){ return c.toUpperCase(); });
    }

    function formatWhyEnglish(val) {
      if (!val) return '—';
      // val can be a comma-separated string or an array
      var items = Array.isArray(val) ? val : val.split(',');
      var map = {
        'work': 'Lavoro', 'travel': 'Viaggi', 'study': 'Studio',
        'family': 'Famiglia', 'friends': 'Amici', 'hobby': 'Hobby',
        'relocation': 'Trasferimento', 'culture': 'Cultura',
        'exams': 'Esami', 'certification': 'Certificazione'
      };
      return items.map(function(item) {
        var key = item.trim().toLowerCase();
        return map[key] || item.trim();
      }).join(', ');
    }

    // ── Inline name editor ──
    window.editProfileName = function() {
      var nameEl = document.getElementById('profileDisplayName');
      var currentName = (nameEl && nameEl.textContent !== '—') ? nameEl.textContent : '';
      appPrompt('Modifica il tuo nome:', function(newName){
        if (newName === null) return; // Cancelled
        newName = newName.trim().substring(0, 20);
        if (!newName) return;
        // Update display
        if (nameEl) nameEl.textContent = newName;
        // Save to Supabase + localStorage immediately
        if (typeof SottotitoliData !== 'undefined' && SottotitoliData.saveProfileField) {
          SottotitoliData.saveProfileField('display_name', newName);
        }
        // Update settings + profile caches (so dashboard/hero re-reads pick it up)
        if (window._settingsData) window._settingsData.display_name = newName;
        if (window._sottotitoliProfile) { window._sottotitoliProfile.display_name = newName; window._sottotitoliProfile.full_name = newName; }
        // Dashboard hero — reflect immediately (renderHero also refreshes streak/goal)
        if (typeof renderHero === 'function') renderHero(newName);
        var hn = document.getElementById('heroName');
        if (hn) hn.textContent = newName;
        // Update dropdown
        var ddName = document.getElementById('ddName');
        if (ddName) ddName.textContent = newName;
        if (typeof window.showToast === 'function') window.showToast('✓ Nome salvato', 'success');
      }, 'Modifica nome', '✏️', 'Nome…', currentName);
    };

    // ═══ Load AI Starter Report from Supabase ═══
    function _loadStarterReport() {
      var card = document.getElementById('starterReportCard');
      var content = document.getElementById('starterReportContent');
      if (!card || !content) return;
      var sb = window.sottotitoliSupabase;
      if (!sb) return;
      sb.auth.getSession().then(function(r) {
        if (!r.data?.session) return;
        sb.from('onboarding_responses').select('starter_report_md').eq('user_id', r.data.session.user.id).maybeSingle().then(function(res) {
          if (res.data && res.data.starter_report_md) {
            var md = res.data.starter_report_md;
            // Show first 3 paragraphs as preview
            var preview = md.split('\n').filter(function(l) { return l.trim(); }).slice(0, 8).join('\n');
            content.innerHTML = _simpleMarkdown(preview) + '<p style=\"color:var(--text-faint);font-style:italic;margin-top:8px\">…</p>';
            content.setAttribute('data-full', md);
            card.style.display = 'block';
          }
        });
      });
    }

    window.toggleStarterReport = function() {
      var content = document.getElementById('starterReportContent');
      var btn = document.getElementById('starterReportToggle');
      if (!content || !btn) return;
      var full = content.getAttribute('data-full');
      if (!full) return;
      if (btn.textContent.indexOf('Leggi') !== -1) {
        content.innerHTML = _simpleMarkdown(full);
        content.style.maxHeight = 'none';
        btn.textContent = 'Mostra meno ↑';
      } else {
        var preview = full.split('\n').filter(function(l) { return l.trim(); }).slice(0, 8).join('\n');
        content.innerHTML = _simpleMarkdown(preview) + '<p style=\"color:var(--text-faint);font-style:italic;margin-top:8px\">…</p>';
        content.style.maxHeight = '300px';
        btn.textContent = 'Leggi il report completo →';
      }
    };

    function _simpleMarkdown(md) {
      if (!md) return '';
      return md
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/^### (.+)$/gm, '<h4 style=\"margin:12px 0 4px;color:var(--text)\">$1</h4>')
        .replace(/^## (.+)$/gm, '<h3 style=\"margin:14px 0 6px;color:var(--text)\">$1</h3>')
        .replace(/^# (.+)$/gm, '<h3 style=\"margin:14px 0 6px;color:var(--text)\">$1</h3>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n\n/g, '</p><p style=\"margin:4px 0\">')
        .replace(/\n/g, '<br>');
    }
  }

  // Run on page load and when Grammar Hub panel opens
  setTimeout(loadOnboardingObjectives, 500);
  var insNav = document.querySelector('[data-panel="grammar-hub"]');
  if (insNav) { insNav.addEventListener('click', function() { setTimeout(loadOnboardingObjectives, 300); }); }

  // ═══ Profile avatar — load from Google OAuth metadata ═══
  // Also mirrors the picture into the topbar avatar button (rounded box).
  function applyTopbarAvatar(src){
    var tb = document.getElementById('topbarAvatar');
    var fb = document.getElementById('topbarAvatarFallback');
    if (tb) { tb.src = src || ''; tb.style.display = src ? '' : 'none'; }
    if (fb) fb.style.display = src ? 'none' : 'flex';
  }
  window.applyTopbarAvatar = applyTopbarAvatar;
  function loadProfileAvatar() {
    var img = document.getElementById('profileAvatar');
    var placeholder = document.getElementById('profileAvatarPlaceholder');
    var nameEl = document.getElementById('profileDisplayName');
    var emailEl = document.getElementById('profileEmail');
    var sb = window.sottotitoliSupabase;
    if (!sb) { setTimeout(loadProfileAvatar, 500); return; }
    sb.auth.getSession().then(async function(r) {
      var user = r.data?.session?.user;
      if (!user) return;
      // Prefer the user's SAVED display name (edited in profile) over the OAuth metadata name,
      // so the edit sticks after re-opening the panel / re-logging in.
      var savedName = (window._settingsData && window._settingsData.display_name) || (window._sottotitoliProfile && window._sottotitoliProfile.display_name) || '';
      var name = savedName || user.user_metadata?.full_name || user.email?.split('@')[0] || '';
      if (nameEl) nameEl.textContent = name || 'Utente';
      if (emailEl) emailEl.textContent = user.email || '';

      // 1. Try profiles.avatar_url from Supabase first (custom upload)
      try {
        var pr = await sb.from('profiles').select('avatar_url').eq('id', user.id).maybeSingle();
        if (!pr.error && pr.data && pr.data.avatar_url) {
          if (img) { img.src = pr.data.avatar_url; img.style.display = ''; }
          if (placeholder) placeholder.style.display = 'none';
          applyTopbarAvatar(pr.data.avatar_url);
          // Update localStorage cache
          try { localStorage.setItem('sottotitoli-avatar', pr.data.avatar_url); } catch(ex) {}
          return;
        }
      } catch(e) { /* fall through to Google avatar */ }

      // 2. Google OAuth avatar fallback
      var googleAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || '';
      if (img && googleAvatar) {
        img.src = googleAvatar;
        img.style.display = '';
        if (placeholder) placeholder.style.display = 'none';
        applyTopbarAvatar(googleAvatar);
        return;
      }

      // 3. localStorage fallback (last resort)
      try {
        var saved = localStorage.getItem('sottotitoli-avatar');
        if (saved && img) {
          img.src = saved; img.style.display = '';
          if (placeholder) placeholder.style.display = 'none';
          applyTopbarAvatar(saved);
        }
      } catch(e) {}
    });
  }
  // Expose so the profile-nav handler in the main async IIFE can call it
  window.loadProfileAvatar = loadProfileAvatar;

  // ═══ Avatar upload — persists to Supabase profiles ═══
  window.uploadAvatar = async function(input) {
    var file = input.files && input.files[0];
    if (!file) return;
    // Validate: max 200KB, only PNG/JPG/WebP
    if (file.size > 200 * 1024) { appAlert('Immagine troppo grande. Massimo 200KB.', 'File non valido', '⚠️'); return; }
    var allowed = ['image/png','image/jpeg','image/webp'];
    if (allowed.indexOf(file.type) === -1) { appAlert('Formato non supportato. Usa PNG, JPG o WebP.', 'File non valido', '⚠️'); return; }

    var reader = new FileReader();
    reader.onload = async function(e) {
      var dataUrl = e.target.result;
      var img = document.getElementById('profileAvatar');
      var placeholder = document.getElementById('profileAvatarPlaceholder');
      // Show immediately
      if (img) { img.src = dataUrl; img.style.display = ''; }
      if (placeholder) placeholder.style.display = 'none';
      applyTopbarAvatar(dataUrl);

      // Save to localStorage as instant cache
      try { localStorage.setItem('sottotitoli-avatar', dataUrl); } catch(ex) {}

      // Persist to Supabase profiles.avatar_url
      var sb = window.sottotitoliSupabase;
      if (sb) {
        try {
          var r = await sb.auth.getSession();
          var userId = r.data?.session?.user?.id;
          if (userId) {
            var ur = await sb.from('profiles').upsert(
              { id: userId, avatar_url: dataUrl, updated_at: new Date().toISOString() },
              { onConflict: 'id' }
            );
            if (ur.error) {
              console.warn('Avatar save to profiles failed:', ur.error.message);
              // Still show toast — image is at least in localStorage
              showAvatarToast('⚠️ Salvata in locale — ' + ur.error.message);
            } else {
              showAvatarToast('✓ Immagine profilo salvata');
            }
          }
        } catch(e) {
          console.warn('Avatar save error:', e.message);
          showAvatarToast('⚠️ Salvata in locale');
        }
      } else {
        showAvatarToast('⚠️ Accedi per salvare permanentemente');
      }
    };
    reader.readAsDataURL(file);
  };

  function showAvatarToast(msg) {
    var toast = document.getElementById('toastMsg');
    if (!toast) return;
    toast.textContent = msg;
    toast.style.background = msg.indexOf('✓') === 0 ? 'var(--green, #059669)' : 'var(--amber, #d97706)';
    toast.classList.add('show');
    setTimeout(function(){ toast.classList.remove('show'); toast.style.background = ''; }, 3000);
  }

  // Try to load saved avatar from localStorage (instant, before Supabase)
  (function() {
    try {
      var saved = localStorage.getItem('sottotitoli-avatar');
      if (saved) {
        var img = document.getElementById('profileAvatar');
        var placeholder = document.getElementById('profileAvatarPlaceholder');
        if (img) { img.src = saved; img.style.display = ''; }
        if (placeholder) placeholder.style.display = 'none';
        applyTopbarAvatar(saved);
      }
    } catch(e) {}
  })();

  setTimeout(loadProfileAvatar, 800);
})();
