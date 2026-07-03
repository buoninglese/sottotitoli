/* ═══ Sotto Supreme Theme v2 — Shared JavaScript ═══ */
/* Theme toggle, dropdowns, sidebar nav, sub-tabs, FAQ, word banks, tasks */

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
      r.innerHTML='<td style="padding:8px 10px"><span contenteditable="true" style="outline:none;border-bottom:1px dashed transparent;padding:2px 0;transition:border var(--transition)" onfocus="this.style.borderColor=\'var(--teal)\'" onblur="this.style.borderColor=\'transparent\'">'+v+'</span></td><td style="padding:8px 10px"><select style="padding:4px 8px;border-radius:8px;border:1px solid var(--line);background:var(--bg);font-size:11px;font-family:var(--font-ui);font-weight:600;color:var(--teal);cursor:pointer" onchange="var m={doing:\'#d97706\',todo:\'var(--teal)\',done:\'var(--green)\'};this.style.color=m[this.value]||\'\'"><option value="doing" style="color:#d97706">In corso</option><option value="todo" style="color:var(--teal)" selected>Da fare</option><option value="done" style="color:var(--green)">Completato</option></select></td><td style="padding:8px 10px;font-size:11px;color:var(--text-faint)">oggi</td><td style="padding:8px 10px"><button style="border:none;background:none;color:var(--text-faint);cursor:pointer;font-size:13px;padding:2px 6px;border-radius:6px;transition:all var(--transition)" onmouseover="this.style.color=\'#dc2626\';this.style.background=\'rgba(220,38,38,.08)\'" onmouseout="this.style.color=\'\';this.style.background=\'\'" onclick="this.closest(\'tr\').remove()"><i class="fa-solid fa-xmark"></i></button></td>';
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
      } else {
        // Close all other open FAQs
        document.querySelectorAll('.faq-item.open').forEach(function(other){
          if(other===item)return;
          var ow=other.querySelector('.faq-a-wrap');
          ow.style.height=ow.scrollHeight+'px';
          requestAnimationFrame(function(){ow.style.height='0px'});
          other.classList.remove('open');
        });
        item.classList.add('open');
        wrap.style.height = '0px';
        requestAnimationFrame(function() { wrap.style.height = wrap.scrollHeight + 'px'; });
        setTimeout(function() { if (item.classList.contains('open')) wrap.style.height = 'auto'; }, 420);
      }
    }
    document.addEventListener('click', function(e){
      document.querySelectorAll('.tr-dd.open').forEach(function(d){ d.classList.remove('open'); });
      // Close topbar dropdowns when clicking outside
      if(!e.target.closest('#notifBtn')&&!e.target.closest('#notifDropdown')){
        document.getElementById('notifDropdown').classList.remove('open');
      }
      if(!e.target.closest('#userBtn')&&!e.target.closest('#userDropdown')){
        document.getElementById('userDropdown').classList.remove('open');
      }
    });
    /* ── Topbar: notification dropdown ── */
    document.getElementById('notifBtn').addEventListener('click',function(e){
      e.stopPropagation();
      document.getElementById('userDropdown').classList.remove('open');
      document.getElementById('notifDropdown').classList.toggle('open');
    });
    /* ── Topbar: user dropdown ── */
    document.getElementById('userBtn').addEventListener('click',function(e){
      e.stopPropagation();
      document.getElementById('notifDropdown').classList.remove('open');
      document.getElementById('userDropdown').classList.toggle('open');
    });
    /* ── Theme toggle ── */
    (function(){
      var btn=document.getElementById('themeToggle');
      if(!btn)return;
      var themeText=btn.querySelector('.theme-text');
      if(!themeText)return;
      var html=document.documentElement;
      var current=html.getAttribute('data-theme')||document.body.getAttribute('data-theme')||'light';
      themeText.textContent=current==='dark'?'Light':'Dark';
      btn.addEventListener('click',function(){
        var t=html.getAttribute('data-theme')==='dark'?'light':'dark';
        html.setAttribute('data-theme',t);
        document.body.setAttribute('data-theme',t);
        themeText.textContent=t==='dark'?'Light':'Dark';
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
    /* ── Language switch ── */
    var currentLang = 'en';
    function switchLang(lang, btn){
      currentLang = lang;
      document.querySelectorAll('.lang-opt').forEach(function(o){ o.classList.remove('active'); });
      btn.classList.add('active');
      // Update visible data in language-dependent panels
      var labels = document.querySelectorAll('.lang-label');
      labels.forEach(function(l){ l.textContent = lang === 'en' ? 'English' : 'Italiano'; });
    }
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
            panels.forEach(function(p){ p.style.display = ''; });
            document.querySelector('.main-panel').style.overflowY = 'auto';
          }
          navItems.forEach(function(n){ n.classList.remove('active'); });
          this.classList.add('active');
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
      panel.querySelectorAll('.tab-link').forEach(function(t){ t.classList.remove('active'); });
      tab.classList.add('active');
      panel.querySelectorAll('.subtab-pane').forEach(function(p){ p.classList.remove('active'); });
      var target = document.getElementById('sub-' + subId);
      if(target) target.classList.add('active');
    });

    function toggleStartSession(){
      var ss=document.getElementById('startSplit'),cp=document.querySelectorAll('.content-panel'),mp=document.querySelector('.main-panel');
      ss.classList.toggle('active');
      cp.forEach(function(p){p.style.display=ss.classList.contains('active')?'none':''});
      mp.style.overflowY=ss.classList.contains('active')?'hidden':'auto';
      if(!ss.classList.contains('active')){document.getElementById('pnl-panoramica').classList.add('active');document.getElementById('pnl-panoramica').style.display=''}
    }

    var ssFlags=[{code:'en',flag:'🇬🇧',name:'English'},{code:'it',flag:'🇮🇹',name:'Italiano'},{code:'fr',flag:'🇫🇷',name:'Francese'},{code:'de',flag:'🇩🇪',name:'Tedesco'},{code:'es',flag:'🇪🇸',name:'Spagnolo'},{code:'nl',flag:'🇳🇱',name:'Olandese'},{code:'pt',flag:'🇵🇹',name:'Portoghese'},{code:'pl',flag:'🇵🇱',name:'Polacco'}];
    var ssCapCode='en',ssSrcCode='en',ssTgtCode='it';

    function openSSSpinner(el,key){
      var half=el.closest('.start-half'),spinner=half.querySelector('.start-spinner'),grid=spinner.querySelector('.ssg');
      var cur=key==='cap'?ssCapCode:key==='src'?ssSrcCode:ssTgtCode;
      if(key==='src'){spinner.querySelector('.sst').textContent='Io parlo in…'}
      else if(key==='tgt'){spinner.querySelector('.sst').textContent='Sottotitoli in…'}
      grid.innerHTML='';
      ssFlags.forEach(function(f){var c=document.createElement('button');c.className='ssc'+(f.code===cur?' selected':'');c.textContent=f.flag+' '+f.name;c.onclick=function(){if(key==='cap')ssCapCode=f.code;else if(key==='src')ssSrcCode=f.code;else ssTgtCode=f.code;grid.querySelectorAll('.ssc').forEach(function(x){x.classList.remove('selected')});c.classList.add('selected');updSSFlags()};grid.appendChild(c)});
      spinner.classList.add('show');
    }
    function closeSSSpinner(key){
      var s=key==='cap'?document.getElementById('ssCapSpinner'):document.getElementById('ssTrSpinner');
      if(s)s.classList.remove('show');
    }
    function updSSFlags(){
      var cf=ssFlags.find(function(f){return f.code===ssCapCode}),sf=ssFlags.find(function(f){return f.code===ssSrcCode}),tf=ssFlags.find(function(f){return f.code===ssTgtCode});
      var cfEl=document.getElementById('ssCapFlag'),cnEl=document.getElementById('ssCapName');if(cfEl)cfEl.textContent=cf.flag;if(cnEl)cnEl.textContent=cf.name;
      var sfEl=document.getElementById('ssSrcFlag'),snEl=document.getElementById('ssSrcName');if(sfEl)sfEl.textContent=sf.flag;if(snEl)snEl.textContent=sf.name;
      var tfEl=document.getElementById('ssTgtFlag'),tnEl=document.getElementById('ssTgtName');if(tfEl)tfEl.textContent=tf.flag;if(tnEl)tnEl.textContent=tf.name;
    }
    /* ── Start session buttons ── */
    (function(){
      var capBtn=document.querySelector('.start-btn.cap');
      var trBtn=document.querySelector('.start-btn.tr');
      if(capBtn){
        capBtn.addEventListener('click',function(){
          window.location.href='studio-caption.html?lang='+ssCapCode;
        });
      }
      if(trBtn){
        trBtn.addEventListener('click',function(){
          window.location.href='studio-caption.html?src='+ssSrcCode+'&tgt='+ssTgtCode;
        });
      }
    })();
