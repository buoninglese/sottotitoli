  /* ── Wrapped theme switcher (Modern / Retro / Gen-Z) ── */
  (function(){
    // Ensure a global applyTheme exists (the main async IIFE may not have exposed it yet)
    if (typeof window.applyTheme !== 'function') {
      window.applyTheme = function(t){
        if (t === 'auto') {
          t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        document.documentElement.setAttribute('data-theme', t);
        document.body.setAttribute('data-theme', t);
        try { localStorage.setItem('sottotitoli-theme', t); } catch(e){}
      };
    }
    var sw = document.getElementById('wrappedSwitcher');
    if (!sw) return;
    var btns = sw.querySelectorAll('.wtheme-btn[data-wtheme]');
    var brightBtn = document.getElementById('wthemeBrightness');
    // family → { dark: themeName, light: themeName }
    var FAMILIES = {
      'modern': { dark:'modern', light:'modern-light' },
      'genz':   { dark:'genz-dark', light:'genz' }
    };
    var THEMES = ['modern','modern-light','genz','genz-dark'];

    function isWrapped(t){ return THEMES.indexOf(t) !== -1; }
    function familyOf(t){
      var f = null;
      Object.keys(FAMILIES).forEach(function(k){
        var v = FAMILIES[k];
        if (v.dark === t || v.light === t) f = k;
      });
      return f;
    }
    function isDarkVariant(t){
      var f = familyOf(t);
      return f ? FAMILIES[f].dark === t : null;
    }

    function highlight(){
      var cur = document.documentElement.getAttribute('data-theme') || 'modern';
      var active = isWrapped(cur) ? familyOf(cur) : 'modern';
      btns.forEach(function(b){
        var on = b.getAttribute('data-wtheme') === active;
        b.style.background = on ? '#fff' : 'transparent';
        b.style.color = on ? '#0a0a0a' : 'var(--text-soft)';
        b.style.boxShadow = on ? '0 2px 8px rgba(0,0,0,.18)' : 'none';
      });
      // Brightness button: only meaningful when a wrapped family is active
      if (brightBtn) {
        var fam = familyOf(cur);
        if (fam) {
          var dark = isDarkVariant(cur);
          brightBtn.style.opacity = '1';
          brightBtn.style.pointerEvents = 'auto';
          brightBtn.textContent = dark ? '☾' : '☀';
          brightBtn.setAttribute('data-bright', dark ? 'dark' : 'light');
          brightBtn.style.background = 'rgba(128,128,128,.12)';
        } else {
          brightBtn.style.opacity = '.3';
          brightBtn.style.pointerEvents = 'none';
          brightBtn.textContent = '☾';
          brightBtn.style.background = 'transparent';
        }
      }
    }

    sw.addEventListener('click', function(e){
      var b = e.target.closest('.wtheme-btn[data-wtheme]');
      if (b) {
        var w = b.getAttribute('data-wtheme');
        var cur = document.documentElement.getAttribute('data-theme') || 'modern';
        if (!isWrapped(cur)) cur = 'modern';
        // Keep the current brightness preference when switching families
        var pref = (brightBtn && brightBtn.getAttribute('data-bright') === 'dark') || isWrapped(cur) && isDarkVariant(cur);
        window.applyTheme(pref ? FAMILIES[w].dark : FAMILIES[w].light);
        return;
      }
      // Brightness toggle
      if (e.target.closest('#wthemeBrightness')) {
        var curT = document.documentElement.getAttribute('data-theme') || 'modern';
        var fam = familyOf(curT);
        if (!fam) return;
        var dark = isDarkVariant(curT);
        window.applyTheme(dark ? FAMILIES[fam].light : FAMILIES[fam].dark);
      }
    });

    document.addEventListener('click', function(e){
      if (e.target.closest('#settingsThemeCards')) setTimeout(highlight, 20);
    });
    if (typeof MutationObserver !== 'undefined') {
      new MutationObserver(function(){ highlight(); })
        .observe(document.documentElement, { attributes:true, attributeFilter:['data-theme'] });
    }
    highlight();
  })();
