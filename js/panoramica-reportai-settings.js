              (function(){
                // ── Tone cards ──
                var toneBtns = document.querySelectorAll('#raiToneCards .rai-tone-btn');
                toneBtns.forEach(function(btn){
                  btn.addEventListener('click', function(){
                    toneBtns.forEach(function(b){
                      b.classList.remove('active');
                      b.style.borderColor = 'var(--line)';
                      var dot = b.querySelector('.rai-dot');
                      if (dot) { dot.style.border = '2px solid var(--line)'; dot.innerHTML = ''; }
                      var icon = b.querySelector('.material-symbols-outlined');
                      if (icon) icon.style.color = 'var(--text-soft)';
                      var label = b.querySelector('p');
                      if (label) label.style.color = 'var(--text)';
                    });
                    this.classList.add('active');
                    this.style.borderColor = 'var(--cyan)';
                    var dot = this.querySelector('.rai-dot');
                    if (dot) { dot.style.border = '4px solid var(--cyan)'; dot.innerHTML = '<span style="width:8px;height:8px;border-radius:50%;background:var(--cyan);display:block"></span>'; }
                    var icon = this.querySelector('.material-symbols-outlined');
                    if (icon) icon.style.color = 'var(--cyan)';
                    var label = this.querySelector('p');
                    if (label) label.style.color = 'var(--cyan)';
                  });
                });

                // ── Language cards ──
                var langBtns = document.querySelectorAll('#raiLangCards .rai-lang-btn');
                langBtns.forEach(function(btn){
                  btn.addEventListener('click', function(){
                    langBtns.forEach(function(b){
                      b.classList.remove('active');
                      b.style.borderColor = 'var(--line)';
                      var dot = b.querySelector('.rai-dot');
                      if (dot) { dot.style.border = '2px solid var(--line)'; dot.innerHTML = ''; }
                      var label = b.querySelector('p');
                      if (label) label.style.color = 'var(--text)';
                    });
                    this.classList.add('active');
                    this.style.borderColor = 'var(--cyan)';
                    var dot = this.querySelector('.rai-dot');
                    if (dot) { dot.style.border = '4px solid var(--cyan)'; dot.innerHTML = '<span style="width:8px;height:8px;border-radius:50%;background:var(--cyan);display:block"></span>'; }
                    var label = this.querySelector('p');
                    if (label) label.style.color = 'var(--cyan)';
                  });
                });

                // ── Save ──
                document.getElementById('raiSaveSettings').addEventListener('click', async function(){
                  var toneBtn = document.querySelector('#raiToneCards .rai-tone-btn.active');
                  var langBtn = document.querySelector('#raiLangCards .rai-lang-btn.active');
                  var priorityRadio = document.querySelector('#raiPriorityList input:checked');
                  var tone = toneBtn ? toneBtn.getAttribute('data-tone') : 'academic';
                  var lang = langBtn ? langBtn.getAttribute('data-lang') : 'it';
                  var priority = priorityRadio ? priorityRadio.value : 'accuracy';

                  // Save to localStorage (instant, works offline)
                  localStorage.setItem('rai-tone', tone);
                  localStorage.setItem('rai-lang', lang);
                  localStorage.setItem('rai-priority', priority);

                  // Save to Supabase user_preferences (persistent across devices)
                  try {
                    if (window.SottotitoliData && window.SottotitoliData.getUserId && window.sottotitoliSupabase) {
                      var uid = await window.SottotitoliData.getUserId();
                      if (uid) {
                        var upsertData = { user_id: uid, rai_tone: tone, rai_lang: lang, rai_priority: priority, updated_at: new Date().toISOString() };
                        var res = await window.sottotitoliSupabase.from('user_preferences').upsert(upsertData, { onConflict: 'user_id' });
                        if (res.error) console.warn('Supabase settings save failed:', res.error.message);
                      }
                    }
                  } catch(e) { console.warn('Supabase settings sync error:', e); }

                  showToastMsg('✅ Impostazioni salvate');
                });

                // ── Restore saved settings ──
                (function restoreSettings(){
                  var tone = localStorage.getItem('rai-tone') || 'academic';
                  var lang = localStorage.getItem('rai-lang') || 'it';
                  var priority = localStorage.getItem('rai-priority') || 'accuracy';

                  // Tone
                  var toneBtn = document.querySelector('#raiToneCards .rai-tone-btn[data-tone="'+tone+'"]');
                  if (toneBtn) toneBtn.click();

                  // Language
                  var langBtn = document.querySelector('#raiLangCards .rai-lang-btn[data-lang="'+lang+'"]');
                  if (langBtn) langBtn.click();

                  // Priority
                  var priRadio = document.querySelector('#raiPriorityList input[value="'+priority+'"]');
                  if (priRadio) priRadio.checked = true;

                  // Also try to load from Supabase (overrides localStorage if fresher)
                  if (window.SottotitoliData && window.SottotitoliData.getUserId && window.sottotitoliSupabase) {
                    window.SottotitoliData.getUserId().then(function(uid){
                      if (!uid) return;
                      window.sottotitoliSupabase.from('user_preferences').select('rai_tone,rai_lang,rai_priority,updated_at').eq('user_id', uid).maybeSingle().then(function(res){
                        if (res.data && res.data.rai_tone) {
                          // Supabase has data — use it
                          if (res.data.rai_tone !== tone) {
                            localStorage.setItem('rai-tone', res.data.rai_tone);
                            var tb = document.querySelector('#raiToneCards .rai-tone-btn[data-tone="'+res.data.rai_tone+'"]');
                            if (tb) tb.click();
                          }
                          if (res.data.rai_lang !== lang) {
                            localStorage.setItem('rai-lang', res.data.rai_lang);
                            var lb = document.querySelector('#raiLangCards .rai-lang-btn[data-lang="'+res.data.rai_lang+'"]');
                            if (lb) lb.click();
                          }
                          if (res.data.rai_priority && res.data.rai_priority !== priority) {
                            localStorage.setItem('rai-priority', res.data.rai_priority);
                            var pr = document.querySelector('#raiPriorityList input[value="'+res.data.rai_priority+'"]');
                            if (pr) pr.checked = true;
                          }
                        }
                      }).catch(function(){});
                    }).catch(function(){});
                  }
                })();
              })();
