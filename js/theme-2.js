/* ═══ Sotto Supreme Theme v2 — Shared JavaScript ═══ */
/* Theme toggle, dropdowns, sidebar nav, sub-tabs, FAQ, word banks, tasks */

/* ── q-chip toggle (for <button class="q-chip">) ── */
    document.addEventListener('click', function(e){
      var chip = e.target.closest('button.q-chip');
      if (!chip) return;
      // Skip filter chips inside word bank expands (they use a different interaction)
      if (chip.closest('.wb-expand')) return;
      var isPressed = chip.classList.toggle('active');
      chip.setAttribute('aria-pressed', isPressed);
    });

/* ── Word bank expand/collapse ── */
    function toggleWordBank(card){
      var expand=card.querySelector('.wb-expand');
      var arrow=card.querySelector('h3 span');
      if(!expand)return;
      if(expand.style.display==='none'||!expand.style.display){
        expand.style.display='block';
        if(arrow)arrow.textContent='▾ chiudi';
      }else{
        expand.style.display='none';
        if(arrow)arrow.textContent='▸ espandi';
      }
    }
    /* ── Task table helpers ── */
    function addTask(){
      var inp=document.getElementById('newTaskInput');
      if(!inp)return;
      var v=inp.value.trim();
      if(!v)return;
      var tbody=document.getElementById('taskTable');
      if(!tbody)return;
      tbody=tbody.querySelector('tbody');
      if(!tbody)return;
      var r=tbody.insertRow();r.className='task-row';
      r.innerHTML='<td style="padding:8px 10px"><span contenteditable="true" style="outline:none;border-bottom:1px dashed transparent;padding:2px 0;transition:border var(--transition)" onfocus="this.style.borderColor=\'var(--teal)\'" onblur="this.style.borderColor=\'transparent\'">'+v+'</span></td><td style="padding:8px 10px"><select style="padding:4px 8px;border-radius:8px;border:1px solid var(--line);background:var(--bg);font-size:11px;font-family:var(--font-ui);font-weight:600;color:var(--teal);cursor:pointer" onchange="var m={doing:\'var(--amber)\',todo:\'var(--teal)\',done:\'var(--green)\'};this.style.color=m[this.value]||\'\'"><option value="doing" style="color:var(--amber)">In corso</option><option value="todo" style="color:var(--teal)" selected>Da fare</option><option value="done" style="color:var(--green)">Completato</option></select></td><td style="padding:8px 10px;font-size:11px;color:var(--text-faint)">oggi</td><td style="padding:8px 10px"><button aria-label="Elimina compito" style="border:none;background:none;color:var(--text-faint);cursor:pointer;font-size:13px;padding:2px 6px;border-radius:6px;transition:all var(--transition)" onmouseover="this.style.color=\'#dc2626\';this.style.background=\'rgba(220,38,38,.08)\'" onmouseout="this.style.color=\'\';this.style.background=\'\'" onclick="this.closest(\'tr\').remove()"><svg class="icon" style="width:12px;height:12px"><use href=\'#i-close\'></use></svg></button></td>';
      inp.value='';
      var ar=inp.closest('.addRow');if(ar)ar.style.display='none';
      var btn=document.querySelector('#sub-compiti article button');if(btn)btn.style.display='inline-flex';
    }
    /* ── FAQ accordion (single-open) ── */
    function toggleFAQ(item) {
      var wrap = item.querySelector('.faq-a-wrap');
      var isOpen = item.classList.contains('open');
      if (isOpen) {
        wrap.style.height = wrap.scrollHeight + 'px';
        requestAnimationFrame(function() { wrap.style.height = '0px'; });
        item.classList.remove('open');
        item.setAttribute('aria-expanded','false');
      } else {
        // Close all other open FAQs
        document.querySelectorAll('.faq-item.open').forEach(function(other){
          if(other===item)return;
          var ow=other.querySelector('.faq-a-wrap');
          ow.style.height=ow.scrollHeight+'px';
          requestAnimationFrame(function(){ow.style.height='0px'});
          other.classList.remove('open');
          other.setAttribute('aria-expanded','false');
        });
        item.classList.add('open');
        item.setAttribute('aria-expanded','true');
        wrap.style.height = '0px';
        requestAnimationFrame(function() { wrap.style.height = wrap.scrollHeight + 'px'; });
        setTimeout(function() { if (item.classList.contains('open')) wrap.style.height = 'auto'; }, 420);
      }
    }
    document.addEventListener('click', function(e){
      document.querySelectorAll('.tr-dd.open').forEach(function(d){ d.classList.remove('open'); });
      // Close topbar dropdowns when clicking outside
      if(!e.target.closest('#notifBtn')&&!e.target.closest('#notifDropdown')){
        var nd=document.getElementById('notifDropdown');if(nd)nd.classList.remove('open');
      }
      if(!e.target.closest('#userBtn')&&!e.target.closest('#userDropdown')){
        var ud=document.getElementById('userDropdown');if(ud)ud.classList.remove('open');
      }
    });
    /* ── Topbar: notification dropdown ── */
    var notifBtn=document.getElementById('notifBtn');
    if(notifBtn){
      notifBtn.addEventListener('click',function(e){
        e.stopPropagation();
        var ud2=document.getElementById('userDropdown');if(ud2)ud2.classList.remove('open');
        var nd=document.getElementById('notifDropdown');if(nd)nd.classList.toggle('open');
      });
    }
    /* ── Topbar: user dropdown ── */
    var userBtn=document.getElementById('userBtn');
    if(userBtn){
      userBtn.addEventListener('click',function(e){
        e.stopPropagation();
        var nd3=document.getElementById('notifDropdown');if(nd3)nd3.classList.remove('open');
        var ud3=document.getElementById('userDropdown');if(ud3)ud3.classList.toggle('open');
      });
    }
    /* ── Theme toggle ── */
    (function(){
      var btn=document.getElementById('themeToggle');
      if(!btn)return;
      var themeText=btn.querySelector('.theme-text');
      var html=document.documentElement;
      var current=html.getAttribute('data-theme')||document.body.getAttribute('data-theme')||'light';
      if(themeText) themeText.textContent=current==='dark'?'Light':'Dark';
      btn.addEventListener('click',function(e){
        e.preventDefault();
        var t=(html.getAttribute('data-theme')||document.body.getAttribute('data-theme')||'light')==='dark'?'light':'dark';
        html.setAttribute('data-theme',t);
        document.body.setAttribute('data-theme',t);
        localStorage.setItem('sottotitoli-theme',t);
        if(themeText) themeText.textContent=t==='dark'?'Light':'Dark';
      });
    })();
    /* ── Hero welcome card close ── */
    (function(){
      var btn=document.getElementById('heroClose');
      if(!btn)return;
      btn.addEventListener('click',function(){
        var card=btn.closest('article');
        if(card)card.style.display='none';
      });
    })();
    /* ── Profile hero close ── */
    (function(){
      var btn=document.getElementById('profileHeroClose');
      if(!btn)return;
      btn.addEventListener('click',function(){
        var h=document.getElementById('profileHero');
        if(!h)return;
        h.classList.add('is-closing');
        setTimeout(function(){h.style.display='none'},400);
      });
    })();
    /* ── Language switch ── */
    var STUDY_LANG_KEY = 'sottotitoli-study-lang';
    var currentLang = localStorage.getItem(STUDY_LANG_KEY) || 'en';
    function switchLang(lang, btn){
      currentLang = lang;
      localStorage.setItem(STUDY_LANG_KEY, lang);
      window.SOTTOTITOLI_STUDY_LANG = lang;
      // Update sidebar lang-opt buttons
      document.querySelectorAll('.lang-opt').forEach(function(o){
        o.classList.toggle('active', o.getAttribute('data-lang') === lang);
      });
      // Update hero chips (visual only — they call switchLang themselves)
      document.querySelectorAll('.hero-chip[data-lang]').forEach(function(c){
        c.classList.toggle('active', c.getAttribute('data-lang') === lang);
      });
      // Trigger data refresh for language-dependent panels
      document.dispatchEvent(new CustomEvent('studylang-changed', {detail:lang}));
    }
    // Init on load
    window.SOTTOTITOLI_STUDY_LANG = currentLang;
    (function(){
      var lang = currentLang;
      document.querySelectorAll('.lang-opt').forEach(function(o){
        o.classList.toggle('active', o.getAttribute('data-lang') === lang);
      });
      document.querySelectorAll('.hero-chip[data-lang]').forEach(function(c){
        c.classList.toggle('active', c.getAttribute('data-lang') === lang);
      });
    })();
    /* ── Sidebar nav: switch content panels ── */
    (function(){
      var navItems = document.querySelectorAll('.side-nav .nav-item[data-panel]');
      var panels = document.querySelectorAll('.content-panel');
      navItems.forEach(function(item){
        item.addEventListener('click', function(e){
          e.preventDefault();
          var panelId = this.getAttribute('data-panel');
          // If Start Session is open, close it first
          var ss=document.getElementById('startSplit');
          if(ss&&ss.classList.contains('active')){
            ss.classList.remove('active');
            document.body.style.overflow='';
            panels.forEach(function(p){ p.style.display = ''; });
          }
          navItems.forEach(function(n){ n.classList.remove('active'); n.removeAttribute('aria-current'); });
          this.classList.add('active');
          this.setAttribute('aria-current','page');
          panels.forEach(function(p){ p.classList.remove('active'); });
          var target = document.getElementById('pnl-' + panelId);
          if(target){ target.classList.add('active'); }
        });
      });
    })();
    /* ── Sub-tab switching within content panels ── */
    document.addEventListener('click', function(e){
      var tab = e.target.closest('.tab-link[data-subtab]');
      if(!tab) return;
      e.preventDefault();
      var panel = tab.closest('.content-panel');
      if(!panel) return;
      var subId = tab.getAttribute('data-subtab');
      panel.querySelectorAll('.tab-link').forEach(function(t){ t.classList.remove('active'); t.setAttribute('aria-selected','false'); });
      tab.classList.add('active');
      tab.setAttribute('aria-selected','true');
      panel.querySelectorAll('.subtab-pane').forEach(function(p){ p.classList.remove('active'); });
      var target = document.getElementById('sub-' + subId);
      if(target) target.classList.add('active');
    });

    function toggleStartSession(){
      var ss=document.getElementById('startSplit');
      ss.classList.toggle('active');
      document.body.style.overflow=ss.classList.contains('active')?'hidden':'';
    }
    // Click backdrop to close
    document.addEventListener('click',function(e){
      if(e.target.id==='startSplit') toggleStartSession();
    });
    // Esc to close
    document.addEventListener('keydown',function(e){
      if(e.key==='Escape'){
        var ss=document.getElementById('startSplit');
        if(ss&&ss.classList.contains('active')) toggleStartSession();
      }
    });

    var ssFlags=[{code:'en',flag:'🇬🇧',name:'English'},{code:'it',flag:'🇮🇹',name:'Italiano'},{code:'nl',flag:'🇳🇱',name:'Nederlands'},{code:'fr',flag:'🇫🇷',name:'Français'},{code:'de',flag:'🇩🇪',name:'Deutsch'},{code:'es',flag:'🇪🇸',name:'Español'},{code:'pl',flag:'🇵🇱',name:'Polski'},{code:'pt',flag:'🇵🇹',name:'Português'}];
    var ssCapCode='en',ssSrcCode='en',ssTgtCode='it';

    function openSSSpinner(el,key){
      var half=key==='cap'?document.getElementById('ssCapHalf'):document.getElementById('ssTrHalf'),spinner=half.querySelector('.ss-spinner'),grid=spinner.querySelector('.ssg');
      var cur=key==='cap'?ssCapCode:key==='src'?ssSrcCode:ssTgtCode;
      if(key==='src'){spinner.querySelector('.sst').textContent='Io parlo in…'}
      else if(key==='tgt'){spinner.querySelector('.sst').textContent='Sottotitoli in…'}
      grid.innerHTML='';
      ssFlags.forEach(function(f){var c=document.createElement('button');c.className='ssc'+(f.code===cur?' selected':'');c.textContent=f.flag+' '+f.name;c.onclick=function(){if(key==='cap')ssCapCode=f.code;else if(key==='src')ssSrcCode=f.code;else ssTgtCode=f.code;grid.querySelectorAll('.ssc').forEach(function(x){x.classList.remove('selected')});c.classList.add('selected');updSSFlags()};grid.appendChild(c)});
      spinner.classList.add('show');
      half.classList.add('spinner-open');
    }
    function closeSSSpinner(key){
      var s=key==='cap'?document.getElementById('ssCapSpinner'):document.getElementById('ssTrSpinner');
      if(s){
        s.classList.remove('show');
        var half=key==='cap'?document.getElementById('ssCapHalf'):document.getElementById('ssTrHalf');
        if(half){
          half.classList.remove('spinner-open');
          half.style.pointerEvents='none';void half.offsetHeight;half.style.pointerEvents='';
        }
      }
    }
    function updSSFlags(){
      var cf=ssFlags.find(function(f){return f.code===ssCapCode}),sf=ssFlags.find(function(f){return f.code===ssSrcCode}),tf=ssFlags.find(function(f){return f.code===ssTgtCode});
      var cfEl=document.getElementById('ssCapFlag'),cnEl=document.getElementById('ssCapName');if(cfEl)cfEl.textContent=cf.flag;if(cnEl)cnEl.textContent=cf.name;
      var sfEl=document.getElementById('ssSrcFlag'),snEl=document.getElementById('ssSrcName');if(sfEl)sfEl.textContent=sf.flag;if(snEl)snEl.textContent=sf.name;
      var tfEl=document.getElementById('ssTgtFlag'),tnEl=document.getElementById('ssTgtName');if(tfEl)tfEl.textContent=tf.flag;if(tnEl)tnEl.textContent=tf.name;
    }
    /* ── Start session buttons (handled via inline onclick) ── */

    /* ── 3D Tilt Effect for Start Session Popup ── */
    (function(){
      var tiltActive = false;
      var tiltFrame = null;
      var popup = document.getElementById('ssPopup');
      var diagonal = document.getElementById('ssDiagonal');
      if(!popup||!diagonal) return;
      function tilt(e){
        if(!tiltActive) return;
        var rect = popup.getBoundingClientRect();
        var x = (e.clientX - rect.left) / rect.width;   // 0..1
        var y = (e.clientY - rect.top) / rect.height;   // 0..1
        var rotateY = (x - 0.5) * 8;  // ±4deg
        var rotateX = (0.5 - y) * 4;  // ±2deg
        diagonal.style.transform = 'perspective(2000px) rotateX('+rotateX+'deg) rotateY('+rotateY+'deg)';
      }
      popup.addEventListener('mouseenter',function(){tiltActive=true;tiltFrame=requestAnimationFrame(function loop(e){tilt(e);if(tiltActive)tiltFrame=requestAnimationFrame(loop)});});
      popup.addEventListener('mousemove',function(e){/* handled by rAF loop */});
      popup.addEventListener('mouseleave',function(){
        tiltActive=false;
        if(tiltFrame) cancelAnimationFrame(tiltFrame);
        diagonal.style.transform = 'perspective(2000px) rotateX(0deg) rotateY(0deg)';
        diagonal.style.transition = 'transform .6s cubic-bezier(.1,0,0,1)';
        setTimeout(function(){diagonal.style.transition='';},600);
      });
    })();
    /* ── Genera Snapshot ── */
    var generaSnapshotBtn=document.getElementById('generaSnapshotBtn');
    if(generaSnapshotBtn){
      generaSnapshotBtn.addEventListener('click',function(){
        this.disabled=true;
        this.textContent='Analisi in corso…';
        setTimeout(function(){
          if(generaSnapshotBtn){generaSnapshotBtn.disabled=false;generaSnapshotBtn.textContent='Genera Snapshot'}
          var t=document.getElementById('toastMsg');
          if(t){t.classList.add('show');setTimeout(function(){t.classList.remove('show')},2000)}
        },2000);
      });
    }
    /* ── Genera Report completo ── */
    var generaReportBtn=document.getElementById('generaReportBtn');
    if(generaReportBtn){
      generaReportBtn.addEventListener('click',function(){
        this.disabled=true;
        this.textContent='Elaborazione…';
        setTimeout(function(){
          if(generaReportBtn){generaReportBtn.disabled=false;generaReportBtn.textContent='Genera Report · 1 credito'}
          var t=document.getElementById('toastMsg');
          if(t){t.classList.add('show');setTimeout(function(){t.classList.remove('show')},2000)}
        },2000);
      });
    }
    /* ── Copy referral link ── */
    var copyReferralBtn=document.getElementById('copyReferralBtn');
    if(copyReferralBtn){
      copyReferralBtn.addEventListener('click',function(){
        var url='https://sottotitoli.com/invite/seba';
        navigator.clipboard.writeText(url).then(function(){
          copyReferralBtn.textContent='Copiato ✓';
          setTimeout(function(){copyReferralBtn.textContent='Copia'},2000);
        }).catch(function(){
          copyReferralBtn.textContent='Errore';
          setTimeout(function(){copyReferralBtn.textContent='Copia'},2000);
        });
      });
    }
