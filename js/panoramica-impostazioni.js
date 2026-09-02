          (function(){
            var cards=document.getElementById('settingsThemeCards');
            if(!cards) return;
            cards.addEventListener('click',function(e){
              var label=e.target.closest('label');
              if(!label) return;
              var val=label.querySelector('input[type=radio]');
              if(val){
                var sel=document.getElementById('settingsTheme');
                if(sel) sel.value=val.value;
                if(typeof window.applyTheme==='function') window.applyTheme(val.value);
              }
              cards.querySelectorAll('label').forEach(function(l){
                var border=l.querySelector('div'); /* the outer card div (NOT div:first-child, which is the inner preview box and would wipe its gradient) */
                var check=l.querySelector('.material-symbols-outlined');
                if(l===label){
                  border.style.borderColor='var(--cyan)';
                  border.style.background='rgba(6,182,212,.03)';
                  if(check){check.style.color='var(--cyan)';check.style.opacity='1';}
                  l.querySelector('input[type=radio]').checked=true;
                }else{
                  border.style.borderColor='var(--line)';
                  border.style.background='';
                  if(check){check.style.color='var(--text-soft)';check.style.opacity='0';}
                  l.querySelector('input[type=radio]').checked=false;
                }
              });
            });
            var curTheme=document.getElementById('settingsTheme').value;
            var target=cards.querySelector('input[value="'+curTheme+'"]');
            if(target){ target.closest('label').click(); }
          })();
