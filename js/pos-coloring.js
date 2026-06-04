/**
 * js/pos-coloring.js — SottotitoliPosColoring
 * Real-time Part-of-Speech coloring for all 8 languages.
 * Verbs=pink, Pronouns=blue, Adjectives=amber, Adverbs=green.
 *
 * CSS classes needed in page:
 *   .pos-verb { color: #f472b6 !important }
 *   .pos-pronoun { color: #60a5fa !important }
 *   .pos-adj { color: #fbbf24 !important }
 *   .pos-adv { color: #34d399 !important }
 */
(function(w){
  'use strict';

  var RULES = {
    en: {pronouns:'i,you,he,she,it,we,they,me,him,her,us,them,my,your,his,its,our,their,mine,yours,hers,ours,theirs,myself,yourself,himself,herself,itself,ourselves,yourselves,themselves,who,whom,whose,which,that,this,these,those,someone,anyone,everyone,no one,nobody,somebody,anybody,everybody,nothing,something,anything,everything,each,all,both,few,many,several,some,any,none,one,ones'.split(','),
      verbSuffs:'ing,ed,ize,ise,ify,ate,en,es,s'.split(','),
      adjSuffs:'ful,less,ous,ive,able,ible,al,ial,ic,ish,ent,ant,ary,ory,some,like,esque,worthy'.split(','),
      advSuffs:'ly,wise,wards,ward,where,when,ever'.split(',')},
    it: {pronouns:'io,tu,lui,lei,noi,voi,loro,me,te,sé,ci,vi,li,le,mi,ti,si,gli,lo,la,ne,mio,tuo,suo,nostro,vostro,loro,miei,tuoi,suoi,nostri,vostri,chi,che,cui,quale,quali,questo,questa,questi,queste,quello,quella,quelli,quelle,qualcuno,qualcosa,ognuno,nessuno,niente,tutto,tutti,ogni,alcuni,alcune,ciascuno,chiunque'.split(','),
      verbSuffs:'are,ere,ire,ando,endo,ato,uto,ito,ante,ente,asse,esse,isse,avo,evo,ivo,erò,irò,erei,irei,assi,essi,issi,ai,ei,ò,à,emo,ete,ono,ano'.split(','),
      adjSuffs:'oso,osa,abile,ibile,evole,istico,ale,ile,ivo,ario,orio,esco,igno,astro,ista,ese,ano,ino,etto,one,accio'.split(','),
      advSuffs:'mente,oni'.split(',')},
    fr: {pronouns:'je,tu,il,elle,on,nous,vous,ils,elles,me,te,se,le,la,les,lui,leur,y,en,moi,toi,soi,eux,mon,ton,son,notre,votre,leur,mes,tes,ses,nos,vos,leurs,mien,tien,sien,qui,que,quoi,dont,lequel,laquelle,celui,celle,ceux,celles,ceci,cela,chacun,personne,rien,tout,tous,aucun,plusieurs,certains'.split(','),
      verbSuffs:'er,ir,re,oir,ant,é,i,u,is,it,ait,ions,iez,aient,rais,rait,rions,riez,raient,asse,asses,ât,issions,issiez,issent,ons,ez,ent,ais'.split(','),
      adjSuffs:'eux,euse,ique,able,ible,el,elle,if,ive,al,aux,ieux,ienne,esque,âtre,ois,oise,ain,aine'.split(','),
      advSuffs:'ment,emment,amment'.split(',')},
    es: {pronouns:'yo,tú,usted,él,ella,nosotros,nosotras,vosotros,vosotras,ustedes,ellos,ellas,me,te,se,le,les,lo,la,los,las,nos,os,mí,ti,sí,mi,mis,tu,tus,su,sus,nuestro,nuestra,nuestros,nuestras,vuestro,vuestra,vuestros,vuestras,mío,tuyo,suyo,quién,quiénes,qué,cuál,cuáles,cuyo,cuya,este,esta,estos,estas,ese,esa,esos,esas,aquel,alguien,algo,nadie,nada,todos,cada,ninguno,cualquiera'.split(','),
      verbSuffs:'ar,er,ir,ando,iendo,ado,ido,aba,ía,é,í,aste,iste,ió,aron,ieron,ará,erá,irá,aría,ería,iría,ase,iese,are,iere,o,as,a,amos,an,en,es,e,emos'.split(','),
      adjSuffs:'oso,osa,able,ible,ivo,iva,al,ico,ica,ario,aria,ero,era,ento,enta,izco,izca,esco,esca,udo,uda'.split(','),
      advSuffs:'mente'.split(',')},
    de: {pronouns:'ich,du,er,sie,es,wir,ihr,mich,dich,sich,ihn,uns,euch,mir,dir,ihm,ihnen,mein,dein,sein,unser,euer,ihr,meine,deine,seine,unsere,eure,ihre,wer,wen,wem,wessen,was,welcher,welche,welches,dieser,diese,dieses,jener,jene,jenes,jemand,niemand,etwas,nichts,man,alle,jeder,einige,mehrere,keiner'.split(','),
      verbSuffs:'en,eln,ern,ieren,igen,lichen,end,et,est,te,test,ten,tet,ge,st,t,e'.split(','),
      adjSuffs:'ig,lich,isch,bar,sam,haft,los,voll,reich,arm,frei,mäßig,fähig,wert,würdig,al,ell,iv,ant,ent,abel,ibel'.split(','),
      advSuffs:'weise,maßen,falls,halber,wegen,wärts,seits,dings'.split(',')},
    nl: {pronouns:'ik,jij,u,hij,zij,het,wij,jullie,mij,je,hem,haar,ons,hen,hun,mijn,jouw,zijn,onze,wie,wat,welke,dit,dat,deze,die,iemand,niemand,iets,niets,iedereen,alles,elk,enkele,sommige,vele,menige'.split(','),
      verbSuffs:'en,de,te,den,ten,end,ende,t,dt'.split(','),
      adjSuffs:'ig,elijk,isch,baar,zaam,loos,vol,rijk,arm,achtig,ief,aal,eel,eus,iek,aan'.split(','),
      advSuffs:'erwijs,gewijs,halve,wege,waarts'.split(',')},
    pl: {pronouns:'ja,ty,on,ona,ono,my,wy,oni,one,mnie,ciebie,jego,go,niej,jej,nas,was,ich,im,nim,nią,mój,twój,jego,jej,nasz,wasz,kto,co,który,która,które,ten,ta,to,ci,te,ktoś,coś,nikt,nic,wszyscy,każdy,wszystko,żaden,kilka,niektórzy'.split(','),
      verbSuffs:'ać,eć,ić,yć,ować,ywać,iwać,ę,esz,e,emy,ecie,ą,ałem,ałam,eliśmy,ałyśmy,ł,ła,li,ły,any,ony,ący,ąca'.split(','),
      adjSuffs:'ny,na,ne,owy,owa,owe,ski,ska,skie,iwy,iwa,iwe,awy,awa,awe,liwy,liwa,liwe,alny,elny'.split(','),
      advSuffs:'o,e,ie,ko,ąco'.split(',')},
    pt: {pronouns:'eu,tu,você,ele,ela,nós,vós,vocês,eles,elas,me,te,se,o,a,lhe,nos,vos,os,as,lhes,mim,ti,si,meu,teu,seu,nosso,vosso,minha,tua,sua,nossas,vossas,quem,que,qual,quais,cujo,cuja,este,esta,esse,essa,aquele,aquela,isto,isso,aquilo,alguém,algo,ninguém,nada,todos,cada,algum,nenhum'.split(','),
      verbSuffs:'ar,er,ir,or,ando,endo,indo,ado,ido,ava,ia,ei,ou,aste,iste,iu,aram,eram,iram,ará,erá,irá,aria,eria,iria,asse,esse,isse,o,as,a,amos,em'.split(','),
      adjSuffs:'oso,osa,ável,ível,al,ico,ica,ivo,iva,ário,ária,ento,enta,esco,esca,udo,uda,dor,dora,ante,ente,inte'.split(','),
      advSuffs:'mente'.split(',')}
  };

  function getLK(lc){if(!lc)return'en';var l=lc.toLowerCase();if(l.indexOf('en')===0)return'en';if(l.indexOf('it')===0)return'it';if(l.indexOf('fr')===0)return'fr';if(l.indexOf('es')===0)return'es';if(l.indexOf('de')===0)return'de';if(l.indexOf('nl')===0)return'nl';if(l.indexOf('pl')===0)return'pl';if(l.indexOf('pt')===0)return'pt';return'en';}

  function detectPOS(word, langKey) {
    var r = RULES[langKey] || RULES['en'];
    var w = word.toLowerCase().replace(/[^a-zà-ÿ\u0100-\u024f']/g, '');
    if (!w || w.length < 2) return null;
    if (r.pronouns.indexOf(w) !== -1) return 'pronoun';
    var vs = r.verbSuffs.slice().sort(function(a,b){return b.length-a.length;});
    for (var i=0; i<vs.length; i++) { if (w.length > vs[i].length+1 && w.endsWith(vs[i])) return 'verb'; }
    var as = r.adjSuffs.slice().sort(function(a,b){return b.length-a.length;});
    for (var i=0; i<as.length; i++) { if (w.length > as[i].length+1 && w.endsWith(as[i])) return 'adj'; }
    var ds = r.advSuffs.slice().sort(function(a,b){return b.length-a.length;});
    for (var i=0; i<ds.length; i++) { if (w.length > ds[i].length+1 && w.endsWith(ds[i])) return 'adv'; }
    return null;
  }

  function renderColoredCaption(container, tokens, langCode) {
    if (!container || !tokens) return;
    var lk = getLK(langCode);
    var h = '';
    for (var i=0; i<tokens.length; i++) {
      var t = tokens[i], word = (typeof t==='string')?t:(t.text||''), display = word;
      var pos = detectPOS(word, lk);
      if (pos) { h += '<span class="pos-'+pos+'">'+esc(display)+'</span>'; }
      else { h += esc(display); }
      if (i < tokens.length-1) {
        var nw = (typeof tokens[i+1]==='string')?tokens[i+1]:(tokens[i+1].text||'');
        if (/^[A-Za-zÀ-ÿ\u0100-\u024f']/.test(nw)) h += ' ';
      }
    }
    container.innerHTML = h;
  }

  function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

  w.SottotitoliPosColoring = {
    renderColoredCaption: renderColoredCaption,
    detectPOS: detectPOS,
    getLangKey: getLK
  };
})(window);
