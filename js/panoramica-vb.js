              // ── Synchronous: accent/mode toggles (must exist before IIFE completes) ──
              (function(){
                var schemes = ['2','4','5','6','7'];
                var accentIdx = (function(){ var s = localStorage.getItem('wbx-accent-scheme')||'2'; var i = schemes.indexOf(s); return i >= 0 ? i : 0; })();
                var el = document.getElementById('sub-wb-expand');
                if (el) { el.setAttribute('data-wb-scheme', schemes[accentIdx]); el.setAttribute('data-wb-accent', localStorage.getItem('wbx-accent-mode')||'none'); }

                // ── Sync the Stile button (scheme number + icon) ──
                function syncAccentBtn(){
                  var numEl = document.getElementById('wbxSchemeNum');
                  if (numEl) numEl.textContent = (accentIdx + 1); // renumbered 1-5 (schemes are 2,4,5,6,7)
                  var abtn = document.getElementById('wbxAccentBtn');
                  if (abtn) abtn.innerHTML = '<i class="fa-solid fa-palette"></i> ' + (accentIdx + 1);
                }
                syncAccentBtn();

                window.wbxSetScheme = function(idx){
                  accentIdx = idx;
                  var s = schemes[idx];
                  var e = document.getElementById('sub-wb-expand');
                  if (e) e.setAttribute('data-wb-scheme', s);
                  localStorage.setItem('wbx-accent-scheme', s);
                  syncAccentBtn();
                };
                // Keep old function for backward compat with Italian/VT panels
                window.wbxCycleAccent = function(){
                  accentIdx = (accentIdx + 1) % schemes.length;
                  wbxSetScheme(accentIdx);
                };

                window.wbxToggleFullscreen = function(){
                  var mp = document.querySelector('.main-panel');
                  var btn = document.getElementById('wbxFullscreenBtn');
                  if (!mp) return;
                  if (mp.classList.contains('wbx-fullscreen')) {
                    mp.classList.remove('wbx-fullscreen');
                    if (btn) btn.innerHTML = '<i class="fa-solid fa-expand"></i>';
                    if (btn) btn.title = 'Schermo intero';
                  } else {
                    mp.classList.add('wbx-fullscreen');
                    if (btn) btn.innerHTML = '<i class="fa-solid fa-compress"></i>';
                    if (btn) btn.title = 'Chiudi schermo intero';
                  }
                };
                window.wbxSetMode = function(mode){
                  var e = document.getElementById('sub-wb-expand');
                  if (e) e.setAttribute('data-wb-accent', mode);
                  document.querySelectorAll('#sub-wb-expand [data-wbx-mode]').forEach(function(c){ c.classList.remove('active'); });
                  var btn = document.querySelector('#sub-wb-expand [data-wbx-mode="' + mode + '"]');
                  if (btn) btn.classList.add('active');
                  localStorage.setItem('wbx-accent-mode', mode);
                };
                window.autoSizeExpandWords = function(){
                  document.querySelectorAll('#wbExpandResults .wbx-w').forEach(function(wel){
                    wel.style.fontSize = '';
                    var avail = wel.clientWidth;
                    var need = wel.scrollWidth;
                    if (need > avail && avail > 0) {
                      var ratio = avail / need;
                      var cur = parseFloat(getComputedStyle(wel).fontSize);
                      wel.style.fontSize = Math.max(12, (cur * ratio) * 0.95) + 'px';
                    }
                  });
                };

                // ── Show-more pagination (5 at a time, up to 20) ──
                window.wbxShowMore = function(btn){
                  var hidden = document.querySelectorAll('#wbExpandResults .wbx-box.wbx-hidden-initially');
                  var toShow = Math.min(5, hidden.length);
                  for (var i = 0; i < toShow; i++) {
                    hidden[i].classList.remove('wbx-hidden-initially');
                    hidden[i].style.display = '';
                  }
                  // Update or remove button
                  var remaining = document.querySelectorAll('#wbExpandResults .wbx-box.wbx-hidden-initially');
                  if (remaining.length === 0) {
                    btn.parentElement.remove();
                  } else {
                    btn.innerHTML = '<i class="fa-solid fa-chevron-down"></i> Mostra di più (' + remaining.length + ')';
                  }
                  window.autoSizeExpandWords();
                };

                // Wire up toggle bar clicks
                var bar = document.querySelector('#sub-wb-expand .wbx-toggle-bar');
                if (bar) {
                  bar.addEventListener('click', function(e){
                    var chip = e.target.closest('[data-wbx-mode]');
                    if (chip) { window.wbxSetMode(chip.getAttribute('data-wbx-mode')); return; }
                    if (e.target.closest('#wbxAccentBtn')) { window.wbxCycleAccent(); return; }
                  });
                }
                // Restore active mode chip
                var savedMode = localStorage.getItem('wbx-accent-mode') || 'none';
                var mc = document.querySelector('#sub-wb-expand [data-wbx-mode="' + savedMode + '"]');
                if (mc) {
                  document.querySelectorAll('#sub-wb-expand [data-wbx-mode]').forEach(function(c){ c.classList.remove('active'); });
                  mc.classList.add('active');
                }
              })();
