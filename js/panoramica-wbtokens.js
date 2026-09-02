  /* ── Word-box editorial tokens ──
     Port of dev/word-boxes-editorial-mockup.html: drives the 12 --w-* CSS vars on
     #sub-wb-expand / #sub-wb-expand-it / #vtReviewGrid so the word boxes match the
     approved editorial "Spotlight" design in all 4 themes (modern · modern-light ·
     genz · genz-dark). Recomputes on theme change + data-wb-scheme/data-wb-accent
     change (MutationObservers below), and on load. */
  window.WBToken = (function(){
    'use strict';
    var RAW = {
      '2':{light:{acc:'#0369a1',soft:'#e0f2fe',soft2:'#f0f9ff',text:'#0c2d48',border:'#bae6fd'}, dark:{acc:'#38bdf8',soft:'rgba(56,189,248,.18)',soft2:'rgba(56,189,248,.06)',text:'#7dd3fc',border:'rgba(56,189,248,.40)'}},
      '4':{light:{acc:'#047857',soft:'#d1fae5',soft2:'#ecfdf5',text:'#0f2a1a',border:'#a7f3d0'}, dark:{acc:'#34d399',soft:'rgba(52,211,153,.18)',soft2:'rgba(52,211,153,.06)',text:'#6ee7b7',border:'rgba(52,211,153,.40)'}},
      '5':{light:{acc:'#6d28d9',soft:'#ede9fe',soft2:'#f5f3ff',text:'#1a0f2e',border:'#ddd6fe'}, dark:{acc:'#c4b5fd',soft:'rgba(196,181,253,.18)',soft2:'rgba(196,181,253,.06)',text:'#ddd6fe',border:'rgba(196,181,253,.40)'}},
      '6':{light:{acc:'#b45309',soft:'#fef3c7',soft2:'#fffbeb',text:'#2e2410',border:'#fde68a'}, dark:{acc:'#fbbf24',soft:'rgba(251,191,36,.18)',soft2:'rgba(251,191,36,.06)',text:'#fcd34d',border:'rgba(251,191,36,.40)'}},
      '7':{light:{acc:'#be185d',soft:'#ffe4e6',soft2:'#fff1f2',text:'#2a0f24',border:'#fecdd3'}, dark:{acc:'#fda4af',soft:'rgba(253,164,175,.18)',soft2:'rgba(253,164,175,.06)',text:'#fecdd3',border:'rgba(253,164,175,.40)'}}
    };
    var POS = { 'NOUN':{c:'#2563eb',L:.60}, 'VERB':{c:'#0891b2',L:.60}, 'ADJ':{c:'#7c3aed',L:.62}, 'ADV':{c:'#db2777',L:.62} };
    var CEFR = { 'A1':{c:'#34d399',L:.70}, 'A2':{c:'#2dd4bf',L:.68}, 'B1':{c:'#38bdf8',L:.66}, 'B2':{c:'#818cf8',L:.60}, 'C1':{c:'#a78bfa',L:.62}, 'C2':{c:'#e879f9',L:.64} };
    var TOKENS = ['--w-acc','--w-word','--w-sub','--w-hd1','--w-hd2','--w-hdline','--w-body','--w-border','--w-bar','--w-barline','--w-bartext','--w-acc-text'];

    function hex2rgb(h){ h = String(h).replace('#',''); return [parseInt(h.substr(0,2),16), parseInt(h.substr(2,2),16), parseInt(h.substr(4,2),16)]; }
    function mix(hex, other, t){ var a=hex2rgb(hex), b=hex2rgb(other); return 'rgb('+Math.round(a[0]+(b[0]-a[0])*t)+','+Math.round(a[1]+(b[1]-a[1])*t)+','+Math.round(a[2]+(b[2]-a[2])*t)+')'; }
    function rgba(col, a){ var c = String(col).charAt(0)==='#' ? hex2rgb(col) : String(col).match(/\d+/g); return 'rgba('+c[0]+','+c[1]+','+c[2]+','+a+')'; }
    function lum(col){ var m=String(col).match(/\d+/g); return 0.299*(+m[0])+0.587*(+m[1])+0.114*(+m[2]); }
    function contrastText(col){ return lum(col) > 150 ? '#0b1020' : '#ffffff'; }
    function rgb2hsl(r,g,b){ r/=255; g/=255; b/=255; var mx=Math.max(r,g,b), mn=Math.min(r,g,b), d=mx-mn, h=0, l=(mx+mn)/2, s=d ? (l<.5 ? d/(2*l) : d/(2-2*l)) : 0; if(d){ if(mx===r) h=((g-b)/d)%6; else if(mx===g) h=(b-r)/d+2; else h=(r-g)/d+4; h*=60; if(h<0) h+=360; } return [h, s, l]; }
    function hsl2rgb(h,s,l){ h/=360; var c=(1-Math.abs(2*l-1))*s, x=c*(1-Math.abs((h*6)%2-1)), m=l-c/2, r=0,g=0,b=0; if(h<1/6){r=c;g=x;}else if(h<2/6){r=x;g=c;}else if(h<3/6){g=c;b=x;}else if(h<4/6){g=x;b=c;}else if(h<5/6){r=x;b=c;}else{r=c;b=x;} return 'rgb('+Math.round((r+m)*255)+','+Math.round((g+m)*255)+','+Math.round((b+m)*255)+')'; }
    function lighten(hex, L){ var a=hex2rgb(hex), h=rgb2hsl(a[0],a[1],a[2]); return hsl2rgb(h[0], h[1], L); }

    function wboxVars(theme, raw){
      var t = (theme==='modern'||theme==='genz-dark') ? 'dark' : 'light';
      var p = t==='dark' ? raw.dark : raw.light;
      var v = {
        '--w-acc': p.acc,
        '--w-word': t==='dark' ? p.text : p.acc,
        '--w-sub': t==='dark' ? 'rgba(255,255,255,.62)' : '#35586c',
        '--w-hd1': p.soft, '--w-hd2': p.soft2,
        '--w-hdline': p.border
      };
      if (theme==='modern'){
        v['--w-body']='#151515'; v['--w-border']='rgba(255,255,255,.08)';
        v['--w-bar']='rgba(255,255,255,.03)'; v['--w-barline']='rgba(255,255,255,.12)';
        v['--w-bartext']='rgba(255,255,255,.55)'; v['--w-acc-text']='#06131a';
      } else if (theme==='modern-light'){
        v['--w-body']='#ffffff'; v['--w-border']='#d7e7f2';
        v['--w-bar']=p.soft; v['--w-barline']=p.border; v['--w-bartext']=p.acc;
        v['--w-acc-text']='#ffffff';
      } else if (theme==='genz'){
        v['--w-body']='rgba(255,255,255,.82)'; v['--w-border']='rgba(255,255,255,.6)';
        v['--w-bar']='rgba(255,255,255,.5)'; v['--w-barline']='rgba(255,255,255,.55)';
        v['--w-bartext']=p.acc; v['--w-acc-text']='#ffffff';
      } else {
        v['--w-body']='rgba(30,14,58,.66)'; v['--w-border']='rgba(196,181,253,.24)';
        v['--w-bar']='rgba(255,255,255,.05)'; v['--w-barline']='rgba(196,181,253,.28)';
        v['--w-bartext']='rgba(255,255,255,.6)'; v['--w-acc-text']='#12081f';
      }
      return v;
    }
    function modeVars(theme, acc, L){
      var dark = (theme==='modern'||theme==='genz-dark');
      var accUse = dark ? lighten(acc, L || .58) : acc;
      var word = dark ? lighten(acc, Math.min(1, (L||.58)+.14)) : acc;
      var body = dark ? '#151515' : (theme==='genz' ? 'rgba(255,255,255,.82)' : '#fff');
      var bdr = theme==='genz-dark' ? 'rgba(196,181,253,.24)' : (theme==='genz' ? 'rgba(255,255,255,.6)' : (theme==='modern' ? 'rgba(255,255,255,.08)' : '#d7e7f2'));
      return {
        '--w-acc': accUse,
        '--w-word': word,
        '--w-sub': dark ? 'rgba(255,255,255,.66)' : '#35586c',
        '--w-hd1': dark ? rgba(accUse, .26) : mix(acc, '#ffffff', .9),
        '--w-hd2': dark ? rgba(accUse, .08) : mix(acc, '#ffffff', .96),
        '--w-hdline': dark ? rgba(accUse, .4) : rgba(acc, .35),
        '--w-body': body, '--w-border': bdr,
        '--w-bar': dark ? rgba(accUse, .10) : mix(acc, '#ffffff', .92),
        '--w-barline': dark ? rgba(accUse, .55) : rgba(acc, .4),
        '--w-bartext': dark ? accUse : acc,
        '--w-acc-text': contrastText(accUse)
      };
    }
    function setVars(el, vars){ for (var k in vars) el.style.setProperty(k, vars[k]); }
    function clearVars(el){ for (var i = 0; i < TOKENS.length; i++) el.style.removeProperty(TOKENS[i]); }

    function applyTo(container){
      if (!container) return;
      var theme = document.documentElement.getAttribute('data-theme') || 'modern';
      var scheme = container.getAttribute('data-wb-scheme');
      var mode = container.getAttribute('data-wb-accent');
      var cards = container.querySelectorAll('.wbx-box');
      var i, box;
      for (i = 0; i < cards.length; i++) clearVars(cards[i]);
      if (mode === 'pos' || mode === 'cefr') {
        var table = mode === 'pos' ? POS : CEFR;
        for (i = 0; i < cards.length; i++) {
          box = cards[i];
          var tag = mode === 'pos' ? box.getAttribute('data-pos') : box.getAttribute('data-cefr');
          var def = table[tag];
          setVars(box, def ? modeVars(theme, def.c, def.L) : wboxVars(theme, RAW[scheme] || RAW['2']));
        }
      } else {
        setVars(container, wboxVars(theme, RAW[scheme] || RAW['2']));
      }
    }

    var REFRESH_SELS = ['#sub-wb-expand','#sub-wb-expand-it','#vtReviewGrid'];
    function refreshAll(){
      for (var i = 0; i < REFRESH_SELS.length; i++) {
        var el = document.querySelector(REFRESH_SELS[i]);
        if (el) applyTo(el);
      }
    }
    function watch(el){
      new MutationObserver(function(){ applyTo(el); }).observe(el, { attributes:true, attributeFilter:['data-wb-scheme','data-wb-accent'] });
    }
    function init(){
      refreshAll();
      if (typeof MutationObserver !== 'undefined') {
        new MutationObserver(refreshAll).observe(document.documentElement, { attributes:true, attributeFilter:['data-theme'] });
        for (var i = 0; i < REFRESH_SELS.length; i++) {
          var el = document.querySelector(REFRESH_SELS[i]);
          if (el) watch(el);
        }
      }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
    return { refreshAll: refreshAll, applyTo: applyTo };
  })();
  /* ── Word-box voice buttons (UK/US/IT) — reuse SpeechIcons (browser TTS) ── */
  window.wbxSpeak = function(btn){
    var box = btn.closest('.wbx-box');
    if (!box || !window.SpeechIcons) return;
    var word = box.getAttribute('data-word');
    if (!word) return;
    var v = btn.getAttribute('data-voice');
    if (v === 'it') { window.SpeechIcons.speak(word, { lang:'it-IT', voice:'Google italiano' }); return; }
    if (v === 'us') { window.SpeechIcons.speak(word, { lang:'en-US', voice:'Google US English' }); return; }
    window.SpeechIcons.speak(word, { lang:'en-GB', voice:'Google UK English Male' });
  };
  /* ── Close a Vocabulary Builder intro box: collapse in place, so the content below moves up ── */
  window.wbxCloseIntro = function(btn){
    var box = btn.closest('.wbx-intro-box');
    if (!box || box.classList.contains('closing')) return;
    box.classList.add('closing');
    var h = box.scrollHeight;
    box.style.overflow = 'hidden';
    box.style.transition = 'opacity .22s ease, max-height .32s ease, padding .32s ease, margin .32s ease, border .32s ease';
    box.style.maxHeight = h + 'px';
    void box.offsetHeight; // force reflow so the collapse transition runs
    box.style.opacity = '0';
    box.style.maxHeight = '0px';
    box.style.paddingTop = '0px';
    box.style.paddingBottom = '0px';
    box.style.marginBottom = '0px';
    box.style.borderWidth = '0';
    setTimeout(function(){ box.style.display = 'none'; }, 330);
  };
