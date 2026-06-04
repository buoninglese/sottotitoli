/**
 * js/pos-coloring.js — SottotitoliPosColoring
 * Real-time Part-of-Speech coloring for all 8 languages.
 * Verbs=pink, Pronouns=blue, Adjectives=amber, Adverbs=green.
 * Toggle with ?pos=1 in overlay URL.
 *
 * CSS classes needed:
 *   .pos-verb { color: #f9a8d4 !important; text-shadow: 0 0 8px rgba(249,168,212,.3) }
 *   .pos-pronoun { color: #93c5fd !important; text-shadow: 0 0 8px rgba(147,197,253,.3) }
 *   .pos-adj { color: #fcd34d !important; text-shadow: 0 0 8px rgba(252,211,77,.3) }
 *   .pos-adv { color: #6ee7b7 !important; text-shadow: 0 0 8px rgba(110,231,183,.3) }
 */
(function(w){
  'use strict';

  // ═══════════════ LANGUAGE RULES ═══════════════
  // Each language: pronouns[], verbSuffs[], adjSuffs[], advSuffs[]
  // PLUS exception lists: verbs[], adjs[], advs[], notVerbs[], notAdjs[], notAdvs[]

  var RULES = {

    en: {
      pronouns: 'i,you,he,she,it,we,they,me,him,her,us,them,my,your,his,its,our,their,mine,yours,hers,ours,theirs,myself,yourself,himself,herself,itself,ourselves,yourselves,themselves,who,whom,whose,which,that,this,these,those,someone,anyone,everyone,no one,nobody,somebody,anybody,everybody,nothing,something,anything,everything,each,all,both,few,many,several,some,any,none,one,ones'.split(','),
      verbSuffs: 'ing,ed,ize,ise,ify,ate,en,es,s'.split(','),
      adjSuffs: 'ful,less,ous,ive,able,ible,al,ial,ic,ish,ent,ant,ary,ory,some,like,esque,worthy,y'.split(','),
      advSuffs: 'ly,wise,wards,ward,where,when,ever,times,ways'.split(','),
      // Explicit verbs — common irregulars & short verbs missed by suffixes
      verbs: 'be,am,is,are,was,were,been,being,have,has,had,having,do,does,did,doing,go,goes,going,went,gone,say,says,said,saying,make,makes,making,made,take,takes,taking,took,taken,get,gets,getting,got,gotten,give,gives,giving,gave,given,come,comes,coming,came,know,knows,knew,known,knowing,see,sees,seeing,saw,seen,think,thinks,thinking,thought,want,wants,wanting,wanted,look,looks,looking,looked,use,uses,using,used,find,finds,finding,found,tell,tells,telling,told,ask,asks,asking,asked,work,works,working,worked,seem,seems,seeming,seemed,feel,feels,feeling,felt,try,tries,trying,tried,leave,leaves,leaving,left,call,calls,calling,called,keep,keeps,keeping,kept,let,lets,letting,begin,begins,beginning,began,begun,show,shows,showing,showed,shown,hear,hears,hearing,heard,play,plays,playing,played,run,runs,running,ran,move,moves,moving,moved,live,lives,living,lived,believe,believes,believing,believed,hold,holds,holding,held,bring,brings,bringing,brought,happen,happens,happening,happened,write,writes,writing,wrote,written,sit,sits,sitting,sat,stand,stands,standing,stood,lose,loses,losing,lost,pay,pays,paying,paid,meet,meets,meeting,met,include,includes,including,included,continue,continues,continuing,continued,set,sets,setting,learn,learns,learning,learned,learnt,change,changes,changing,changed,lead,leads,leading,led,understand,understands,understanding,understood,watch,watches,watching,watched,follow,follows,following,followed,stop,stops,stopping,stopped,create,creates,creating,created,speak,speaks,speaking,spoke,spoken,read,reads,reading,allow,allows,allowing,allowed,add,adds,adding,added,spend,spends,spending,spent,grow,grows,growing,grew,grown,open,opens,opening,opened,walk,walks,walking,walked,win,wins,winning,won,offer,offers,offering,offered,remember,remembers,remembering,remembered,consider,considers,considering,considered,appear,appears,appearing,appeared,buy,buys,buying,bought,serve,serves,serving,served,die,dies,dying,died,send,sends,sending,sent,build,builds,building,built,stay,stays,staying,stayed,fall,falls,falling,fell,fallen,cut,cuts,cutting,put,puts,putting,like,likes,liking,liked,love,loves,loving,loved,help,helps,helping,helped,need,needs,needing,needed,start,starts,starting,started,finish,finishes,finishing,finished,wait,waits,waiting,waited,expect,expects,expecting,expected,carry,carries,carrying,carried,eat,eats,eating,ate,eaten,drink,drinks,drinking,drank,drunk,sleep,sleeps,sleeping,slept,wear,wears,wearing,wore,worn,draw,draws,drawing,drew,drawn,fly,flies,flying,flew,flown,swim,swims,swimming,swam,swum,sing,sings,singing,sang,sung,teach,teaches,teaching,taught,break,breaks,breaking,broke,broken,forget,forgets,forgetting,forgot,forgotten'.split(','),
      // Explicit adjectives
      adjs: 'good,bad,big,small,large,new,old,young,high,low,long,short,great,little,right,left,different,next,early,late,important,public,bad,real,true,false,sure,certain,clear,hard,easy,simple,strong,weak,fast,slow,hot,cold,warm,cool,dark,light,white,black,red,blue,green,yellow,happy,sad,angry,afraid,alive,dead,safe,dangerous,possible,impossible,necessary,free,open,closed,full,empty,rich,poor,cheap,expensive,ready,sorry,welcome,fine,okay,nice,pretty,ugly,beautiful,handsome,fair,poor,dry,wet,clean,dirty,thick,thin,wide,narrow,deep,shallow,heavy,light,soft,hard,smooth,rough,sharp,blunt,sweet,sour,salty,bitter,fresh,stale,quiet,loud,noisy,silent,bright,dim,brave,cowardly,kind,cruel,gentle,rough,polite,rude,honest,smart,intelligent,stupid,dumb,wise,foolish,right,wrong,correct,incorrect,able,unable,capable,willing,reluctant,eager,curious,bored,tired,hungry,thirsty,sick,healthy,well,better,best,worse,worst'.split(','),
      // Explicit adverbs
      advs: 'not,now,then,here,there,just,also,too,very,really,quite,almost,already,always,never,sometimes,often,usually,ever,still,yet,again,soon,ago,later,early,today,tomorrow,yesterday,tonight,maybe,perhaps,probably,certainly,definitely,absolutely,maybe,however,therefore,moreover,otherwise,instead,indeed,rather,quite,enough,somewhat,more,most,less,least,so,such,how,why,when,where,well,fast,hard,far,near,close,high,low,deep,long,much,little'.split(','),
      // False positives — words ending in verb-like suffixes that are NOT verbs
      notVerbs: 'thing,nothing,everything,something,anything,king,ring,spring,evening,morning,ceiling,meeting,wedding,building,feeling,meaning,hearing,dealing,leading,reading,spending,ending,wedding,string,stocking,stuffing,pudding,seed,need,weed,deed,feed,red,bed,shed,pled,ted,led,blend,end,uncle,article,particle,test,rest,interest,forest,honest,example,simple,people,table,able,title,little,bottle,cattle,battle,settle,circle,muscle,principle,multiple,couple,double,trouble,vegetable,comfortable,available,necessary,access,goddess,actress,waitress,hostess,mistress,process,success,address,unless,nevertheless,nonetheless,nonetheless,regardless,towards,afterwards,backwards,forwards,inwards,onwards,outwards,upwards,sideways,lengthways'.split(','),
      // False positives — words ending in adj-like suffixes that are NOT adjectives
      notAdjs: 'people,example,simple,table,title,article,particle,circle,muscle,uncle,principle,vehicle,obstacle,miracle,spectacle,tentacle,receptacle,chronicle,curriculum,maximum,minimum,optimum,premium,medium,museum,asylum,symposium,equilibrium,stadium,auditorium,territorium,aluminium,uranium,helium,petroleum,petal,metal,capital,hospital,animal,mammal,cardinal,criminal,chemical,physical,medical,musical,topical,cynical,identical,classical,political,electrical,historical,mechanical,technical,theoretical,practical,radical,catholic'.split(','),
      // False positives — words ending in adv-like suffixes that are NOT adverbs  
      notAdvs: 'family,only,early,apply,reply,supply,imply,multiply,comply,simply,July,belly,jelly,folly,holly,gully,ugly,curly,lovely,lonely,friendly,likely,unlikely,deadly,silly,chilly,bully,ally,rally,tally,valley,volley,monkey,donkey,turkey,key,grey,hey,prey,survey,convey,pulley,barley,hardly,barely,rarely,purely,surely,merely,nearly,clearly,simply,basically,specifically,particularly,especially,originally,finally,actually,equally,usually,generally,naturally'.split(',')
    },

    it: {
      pronouns: 'io,tu,lui,lei,noi,voi,loro,me,te,sé,ci,vi,li,le,mi,ti,si,gli,lo,la,ne,mio,tuo,suo,nostro,vostro,loro,miei,tuoi,suoi,nostri,vostri,chi,che,cui,quale,quali,questo,questa,questi,queste,quello,quella,quelli,quelle,qualcuno,qualcosa,ognuno,nessuno,niente,tutto,tutti,ogni,alcuni,alcune,ciascuno,chiunque'.split(','),
      verbSuffs: 'are,ere,ire,ando,endo,ato,uto,ito,ante,ente,asse,esse,isse,avo,evo,ivo,erò,irò,erei,irei,assi,essi,issi,ai,ei,ò,à,emo,ete,ono,ano'.split(','),
      adjSuffs: 'oso,osa,abile,ibile,evole,istico,ale,ile,ivo,ario,orio,esco,igno,astro,ista,ese,ano,ino,etto,one,accio'.split(','),
      advSuffs: 'mente,oni'.split(','),
      verbs: 'essere,sono,sei,è,siamo,siete,sono,ero,eri,era,eravamo,eravate,erano,fui,fosti,fu,fummo,foste,furono,sarò,sarai,sarà,saremo,sarete,saranno,avere,ho,hai,ha,abbiamo,avete,hanno,avevo,avevi,aveva,avevamo,avevate,avevano,ebbi,avesti,ebbe,avemmo,aveste,ebbero,avrò,avrai,avrà,avremo,avrete,avranno,fare,faccio,fai,fa,facciamo,fate,fanno,facevo,facevi,faceva,facevamo,facevate,facevano,feci,facesti,fece,facemmo,faceste,fecero,farò,farai,farà,faremo,farete,faranno,dire,dico,dici,dice,diciamo,dite,dicono,dicevo,dicevi,diceva,dicevamo,dicevate,dicevano,dissi,dicesti,disse,dicemmo,diceste,dissero,dirò,dirai,dirà,diremo,direte,diranno,andare,vado,vai,va,andiamo,andate,vanno,venire,vengo,vieni,viene,veniamo,venite,vengono,sapere,so,sai,sa,sappiamo,sapete,sanno,potere,posso,puoi,può,possiamo,potete,possono,volere,voglio,vuoi,vuole,vogliamo,volete,vogliono,dovere,devo,devi,deve,dobbiamo,dovete,devono,vedere,vedo,vedi,vede,vediamo,vedete,vedono,stare,sto,stai,sta,stiamo,state,stanno,dare,do,dai,dà,diamo,date,danno,parlare,parlo,parli,parla,parliamo,parlate,parlano,mangiare,mangio,mangi,mangia,mangiamo,mangiate,mangiano,bere,bevo,bevi,beve,beviamo,bevete,bevono,prendere,prendo,prendi,prende,prendiamo,prendete,prendono,mettere,metto,metti,mette,mettiamo,mettete,mettono'.split(','),
      adjs: 'buono,bravo,cattivo,bello,brutto,grande,piccolo,nuovo,vecchio,giovane,alto,basso,lungo,corto,giusto,sbagliato,diverso,ultimo,prossimo,importante,facile,difficile,forte,debole,veloce,lento,caldo,freddo,chiaro,scuro,bianco,nero,rosso,blu,verde,giallo,felice,triste,arrabbiato,vero,falso,sicuro,libero,pieno,vuoto,ricco,povero,pronto,pulito,sporco,dolce,salato,fresco,tranquillo,intelligente,stupido,gentile,onesto,capace,stanco,malato,sano,migliore,peggiore'.split(','),
      advs: 'non,ora,allora,qui,lì,così,anche,troppo,molto,veramente,davvero,quasi,già,sempre,mai,qualche volta,spesso,di solito,ancora,presto,tardi,oggi,domani,ieri,forse,probabilmente,certamente,assolutamente,comunque,invece,piuttosto,abbastanza,più,meno,meglio,peggio,come,quando,dove,perché, bene,male,presto,volentieri,insieme,solo,soltanto,almeno,circa,davanti,dietro,sopra,sotto,dentro,fuori,vicino,lontano'.split(','),
      notVerbs: 'mare,amare,padre,madre,fratello,vero,intero,numero,zero,dito,seme,fame, nome,cognome,come,dove,luce,voce,pace,croce,felce,dolce,pesce,mese,paese,inglese,francese,base,classe,frase,cosa,rosa,posa,casa,tavola,scatola,isola'.split(','),
      notAdjs: 'animale,canale,natale,speciale,ufficiale,sociale,finale,personale,originale,industriale,commerciale,culturale,naturale,materiale,colore,dolore,amore,onore,fiore,valore,errore,terrore,orologio,negozio,ozio,premio,studio'.split(','),
      notAdvs: 'mente,gente,niente,venti,denti,lenti,genti,ponti,conti, fonte,monte,ponte'.split(',')
    },

    fr: {
      pronouns: 'je,tu,il,elle,on,nous,vous,ils,elles,me,te,se,le,la,les,lui,leur,y,en,moi,toi,soi,eux,mon,ton,son,notre,votre,leur,mes,tes,ses,nos,vos,leurs,mien,tien,sien,qui,que,quoi,dont,lequel,laquelle,celui,celle,ceux,celles,ceci,cela,chacun,personne,rien,tout,tous,aucun,plusieurs,certains'.split(','),
      verbSuffs: 'er,ir,re,oir,ant,é,i,u,is,it,ait,ions,iez,aient,rais,rait,rions,riez,raient,asse,asses,ât,issions,issiez,issent,ons,ez,ent,ais'.split(','),
      adjSuffs: 'eux,euse,ique,able,ible,el,elle,if,ive,al,aux,ieux,ienne,esque,âtre,ois,oise,ain,aine'.split(','),
      advSuffs: 'ment,emment,amment'.split(','),
      verbs: 'être,suis,es,est,sommes,êtes,sont,étais,était,étions,étiez,étaient,fus,fut,fûmes,fûtes,furent,serai,seras,sera,serons,serez,seront,avoir,ai,as,a,avons,avez,ont,avais,avait,avions,aviez,avaient,aurai,auras,aura,aurons,aurez,auront,faire,fais,fait,faisons,faites,font,faisais,faisait,faisions,faisiez,faisaient,ferai,feras,fera,ferons,ferez,feront,dire,dis,dit,disons,dites,disent,aller,vais,vas,va,allons,allez,vont,venir,viens,vient,venons,venez,viennent,pouvoir,peux,peut,pouvons,pouvez,peuvent,vouloir,veux,veut,voulons,voulez,veulent,devoir,dois,doit,devons,devez,doivent,savoir,sais,sait,savons,savez,savent,voir,vois,voit,voyons,voyez,voient,prendre,prends,prend,prenons,prenez,prennent,mettre,mets,met,mettons,mettez,mettent,donner,donne,donnes,donnons,donnez,donnent,parler,parle,parles,parlons,parlez,parlent,manger,mange,manges,mangeons,mangez,mangent,boire,bois,boit,buvons,buvez,boivent'.split(','),
      adjs: 'bon,bonne,mauvais,mauvaise,beau,belle,grand,petit,nouveau,nouvelle,vieux,vieille,jeune,haut,bas,long,court,juste,faux,différent,dernier,prochain,important,facile,difficile,fort,faible,rapide,lent,chaud,froid,clair,sombre,blanc,noir,rouge,bleu,vert,jaune,heureux,triste,fâché,vrai,sûr,libre,plein,vide,riche,pauvre,prêt,propre,sale,doux,salé,frais,tranquille,intelligent,stupide,gentil,honnête,capable,fatigué,malade,sain,meilleur,pire'.split(','),
      advs: 'ne,pas,plus,jamais,rien,très,trop,beaucoup,toujours,souvent,parfois,rarement,maintenant,alors,ici,là,aussi,presque,déjà,encore,tôt,tard,aujourd\'hui,demain,hier,peut-être,probablement,certainement,absolument,cependant,donc,plutôt,assez,plus,moins,mieux,pire,comment,quand,où,pourquoi,bien,mal,vite,lentement,ensemble,seul,seulement,environ,devant,derrière,dessus,dessous,dedans,dehors,loin,près'.split(','),
      notVerbs: 'mer,fer,ver,cher,amer,hiver,cuiller,atelier,escalier,dossier,panier,cahier,clavier,levier,olivier,poirier,pommier,prunier,fraisier,groseillier'.split(','),
      notAdjs: 'animal,journal,cheval,hôpital,canal,métal,pétale,cristal,festival,carnaval,original,spécial,officiel,essentiel,materiel,logiciel,éditorial,hebdomadaire,anniversaire,commentaire,formulaire,vestiaire,calvaire,ossuaire,reliquaire'.split(','),
      notAdvs: 'ment,élément,complément,supplément,médicament,bâtiment,vêtement,appartement,gouvernement,parlement,changement,mouvement,jugement,règlement,sentiment,document,monument,instrument,argument,comment,fraîchement'.split(',')
    },

    es: {
      pronouns: 'yo,tú,usted,él,ella,nosotros,nosotras,vosotros,vosotras,ustedes,ellos,ellas,me,te,se,le,les,lo,la,los,las,nos,os,mí,ti,sí,mi,mis,tu,tus,su,sus,nuestro,nuestra,nuestros,nuestras,vuestro,vuestra,vuestros,vuestras,mío,tuyo,suyo,quién,quiénes,qué,cuál,cuáles,cuyo,cuya,este,esta,estos,estas,ese,esa,esos,esas,aquel,alguien,algo,nadie,nada,todos,cada,ninguno,cualquiera'.split(','),
      verbSuffs: 'ar,er,ir,ando,iendo,ado,ido,aba,ía,é,í,aste,iste,ió,aron,ieron,ará,erá,irá,aría,ería,iría,ase,iese,are,iere,o,as,a,amos,an,en,es,e,emos'.split(','),
      adjSuffs: 'oso,osa,able,ible,ivo,iva,al,ico,ica,ario,aria,ero,era,ento,enta,izco,izca,esco,esca,udo,uda'.split(','),
      advSuffs: 'mente'.split(','),
      verbs: 'ser,soy,eres,es,somos,sois,son,era,eras,era,éramos,erais,eran,fui,fuiste,fue,fuimos,fuisteis,fueron,estar,estoy,estás,está,estamos,estáis,están,haber,he,has,ha,hemos,habéis,han,tener,tengo,tienes,tiene,tenemos,tenéis,tienen,hacer,hago,haces,hace,hacemos,hacéis,hacen,decir,digo,dices,dice,decimos,decís,dicen,ir,voy,vas,va,vamos,vais,van,venir,vengo,vienes,viene,venimos,venís,vienen,poder,puedo,puedes,puede,podemos,podéis,pueden,querer,quiero,quieres,quiere,queremos,queréis,quieren,saber,sé,sabes,sabe,sabemos,sabéis,saben,ver,veo,ves,ve,vemos,veis,ven,dar,doy,das,da,damos,dais,dan,poner,pongo,pones,pone,ponemos,ponéis,ponen,hablar,hablo,hablas,habla,hablamos,habláis,hablan,comer,como,comes,come,comemos,coméis,comen,vivir,vivo,vives,vive,vivimos,vivís,viven'.split(','),
      adjs: 'bueno,malo,grande,pequeño,nuevo,viejo,joven,alto,bajo,largo,corto,justo,equivocado,diferente,último,próximo,importante,fácil,difícil,fuerte,débil,rápido,lento,caliente,frío,claro,oscuro,blanco,negro,rojo,azul,verde,amarillo,feliz,triste,enojado,verdadero,falso,seguro,libre,lleno,vacío,rico,pobre,listo,limpio,sucio,dulce,salado,fresco,tranquilo,inteligente,estúpido,amable,honesto,capaz,cansado,enfermo,sano,mejor,peor'.split(','),
      advs: 'no,ahora,entonces,aquí,allí,así,también,demasiado,muy,realmente,casi,ya,siempre,nunca,a veces,a menudo,generalmente,todavía,pronto,tarde,hoy,mañana,ayer,quizás,probablemente,ciertamente,absolutamente,sin embargo,por lo tanto,en cambio,bastante,más,menos,mejor,peor,cómo,cuándo,dónde,por qué,bien,mal,rápido,lento,juntos,solo,solamente,alrededor,delante,detrás,encima,debajo,dentro,fuera,cerca,lejos'.split(','),
      notVerbs: 'mar,altar,lugar,azúcar,melón,limón,jabón,corazón,camión,botón,algodón,portón,malecón,escalón,acarición'.split(','),
      notAdjs: 'animal,canal,capital,cardinal,criminal,festival,material,oficial,original,personal,principal,semanal,arbol,caracol,girasol,español,control,petróleo'.split(','),
      notAdvs: 'mente,gente,puente,fuente,diente,cliente,corriente,ambiente,accidente,presidente,valiente,suficiente,inteligente'.split(',')
    },

    de: {
      pronouns: 'ich,du,er,sie,es,wir,ihr,mich,dich,sich,ihn,uns,euch,mir,dir,ihm,ihnen,mein,dein,sein,unser,euer,ihr,meine,deine,seine,unsere,eure,ihre,wer,wen,wem,wessen,was,welcher,welche,welches,dieser,diese,dieses,jener,jene,jenes,jemand,niemand,etwas,nichts,man,alle,jeder,einige,mehrere,keiner'.split(','),
      verbSuffs: 'en,eln,ern,ieren,igen,lichen,end,et,est,te,test,ten,tet,ge,st,t,e'.split(','),
      adjSuffs: 'ig,lich,isch,bar,sam,haft,los,voll,reich,arm,frei,mäßig,fähig,wert,würdig,al,ell,iv,ant,ent,abel,ibel'.split(','),
      advSuffs: 'weise,maßen,falls,halber,wegen,wärts,seits,dings'.split(','),
      verbs: 'sein,bin,bist,ist,sind,seid,war,warst,waren,wart,gewesen,haben,habe,hast,hat,haben,habt,hatte,hattest,hatten,hattet,gehabt,werden,werde,wirst,wird,werden,werdet,wurde,wurdest,wurden,wurdet,geworden,können,kann,kannst,können,könnt,konnte,konntest,konnten,konntet,gekonnt,müssen,muss,musst,müssen,müsst,musste,musstest,mussten,musstet,gemusst,wollen,will,willst,wollen,wollt,wollte,wolltest,wollten,wolltet,gewollt,sollen,soll,sollst,sollen,sollt,sollte,solltest,sollten,solltet,gesollt,dürfen,darf,darfst,dürfen,dürft,durfte,durftest,durften,durftet,gedurft,mögen,mag,magst,mögen,mögt,mochte,mochtest,mochten,mochtet,gemocht,machen,mache,machst,macht,gemacht,gehen,gehe,gehst,geht,ging,gingst,gingen,gingt,gegangen,kommen,komme,kommst,kommt,kam,kamst,kamen,kamt,gekommen,sagen,sage,sagst,sagt,sagte,sagtest,sagten,sagtet,gesagt,sehen,sehe,siehst,sieht,sah,sahst,sahen,saht,gesehen,geben,gebe,gibst,gibt,gab,gabst,gaben,gabt,gegeben,wissen,weiß,weißt,wissen,wisst,wusste,wusstest,wussten,wusstet,gewusst,lassen,lasse,lässt,lasst,ließ,ließt,ließen,ließt,gelassen,stehen,stehe,stehst,steht,stand,standst,standen,standet,gestanden,finden,finde,findest,findet,fand,fandst,fanden,fandet,gefunden,bleiben,bleibe,bleibst,bleibt,blieb,bliebst,blieben,bliebt,geblieben'.split(','),
      adjs: 'gut,schlecht,groß,klein,neu,alt,jung,hoch,lang,kurz,richtig,falsch,verschieden,letzt,nächst,wichtig,einfach,schwierig,stark,schwach,schnell,langsam,warm,kalt,klar,dunkel,weiß,schwarz,rot,blau,grün,gelb,glücklich,traurig,wütend,wahr,sicher,frei,voll,leer,reich,arm,fertig,sauber,schmutzig,süß,salzig,frisch,ruhig,klug,dumm,freundlich,ehrlich,fähig,müde,krank,gesund,besser,schlechter'.split(','),
      advs: 'nicht,jetzt,dann,hier,dort,so,auch,sehr,ziemlich,fast,schon,immer,nie,manchmal,oft,gewöhnlich,noch,bald,spät,heute,morgen,gestern,vielleicht,wahrscheinlich,sicherlich,absolut,jedoch,deshalb,stattdessen,ziemlich,genug,mehr,weniger,besser,schlechter,wie,wann,wo,warum,gut,schlecht,schnell,langsam,zusammen,allein,nur,ungefähr,vorn,hinten,oben,unten,drinnen,draußen,nah,weit'.split(','),
      notVerbs: 'Meer,Heer,sehr,mehr,leer,schwer,er,der,wer,her, Charakter, Theater,Fenster,Polster,Kataster,Minister,Register'.split(','),
      notAdjs: 'Tisch,Fisch,frisch,Mensch,Deutsch,Wunsch,National,International,Person,Personal,Material,Ideal,Hotel,Kapital,Final,Original,Spezial,Offiziell,Essentiell'.split(','),
      notAdvs: 'Weise,Reise,Reise,Leise,Preise,Kreise,Gleise,Waise,Speise'.split(',')
    },

    nl: {
      pronouns: 'ik,jij,u,hij,zij,het,wij,jullie,mij,je,hem,haar,ons,hen,hun,mijn,jouw,zijn,onze,wie,wat,welke,dit,dat,deze,die,iemand,niemand,iets,niets,iedereen,alles,elk,enkele,sommige,vele,menige'.split(','),
      verbSuffs: 'en,de,te,den,ten,end,ende,t,dt'.split(','),
      adjSuffs: 'ig,elijk,isch,baar,zaam,loos,vol,rijk,arm,achtig,ief,aal,eel,eus,iek,aan'.split(','),
      advSuffs: 'erwijs,gewijs,halve,wege,waarts'.split(','),
      verbs: 'zijn,ben,bent,is,zijn,was,waren,geweest,hebben,heb,hebt,heeft,hebben,had,hadden,gehad,worden,word,wordt,worden,werd,werden,geworden,zullen,zal,zult,zullen,zou,zouden,kunnen,kan,kunt,kunnen,kon,konden,gekund,mogen,mag,mogen,mocht,mochten,willen,wil,wilt,willen,wou,wouden,gewild,moeten,moet,moeten,moest,moesten,doen,doe,doet,doen,deed,deden,gedaan,gaan,ga,gaat,gaan,ging,gingen,gegaan,komen,kom,komt,komen,kwam,kwamen,gekomen,zien,zie,ziet,zien,zag,zagen,gezien,geven,geef,geeft,geven,gaf,gaven,gegeven,nemen,neem,neemt,nemen,nam,namen,genomen,denken,denk,denkt,denken,dacht,dachten,gedacht,weten,weet,weet,weten,wist,wisten,geweten,praten,praat,praten,praatte,praatten,gepraat,werken,werk,werkt,werken,werkte,werkten,gewerkt,leven,leef,leeft,leven,leefde,leefden,geleefd,spelen,speel,speelt,spelen,speelde,speelden,gespeeld,et,drink,drinkt,drinken,dronk,dronken,gedronken'.split(','),
      adjs: 'goed,slecht,groot,klein,nieuw,oud,jong,hoog,laag,lang,kort,juist,fout,verschillend,laatst,volgend,belangrijk,makkelijk,moeilijk,sterk,zwak,snel,traag,warm,koud,helder,donker,wit,zwart,rood,blauw,groen,geel,gelukkig,verdrietig,boos,waar,zeker,vrij,vol,leeg,rijk,arm,klaar,schoon,vuil,zoet,zout,fris,rustig,slim,dom,aardig,eerlijk,bekwaam,moe,ziek,gezond,beter,slechter'.split(','),
      advs: 'niet,nu,dan,hier,daar,zo,ook,heel,erg,bijna,al,altijd,nooit,soms,dikwijls,meestal,nog,al,straks,laat,vandaag,morgen,gisteren,misschien,waarschijnlijk,zeker,absoluut,echter,daarom,in plaats daarvan,tamelijk,genoeg,meer,minder,beter,slechter,hoe,wanneer,waar,waarom,goed,slecht,snel,langzaam,samen,alleen,slechts,ongeveer,voor,achter,boven,beneden,binnen,buiten,dichtbij,ver'.split(','),
      notVerbs: 'meer,zeer,heer,keer,peer,weer,deur,geur,kleur,sfeer,idee,collectie,directie,receptie,redactie,politie,notitie'.split(','),
      notAdjs: 'tafel,lepel,vogel,appel,regel,sleutel,titel,artikel,partikel,hemel,kameel,fluweel,kasteel,juweel,rondeel'.split(','),
      notAdvs: 'wijze,reize,peize,zege,wege,plege,stege'.split(',')
    },

    pl: {
      pronouns: 'ja,ty,on,ona,ono,my,wy,oni,one,mnie,ciebie,jego,go,niej,jej,nas,was,ich,im,nim,nią,mój,twój,jego,jej,nasz,wasz,kto,co,który,która,które,ten,ta,to,ci,te,ktoś,coś,nikt,nic,wszyscy,każdy,wszystko,żaden,kilka,niektórzy'.split(','),
      verbSuffs: 'ać,eć,ić,yć,ować,ywać,iwać,ę,esz,e,emy,ecie,ą,ałem,ałam,eliśmy,ałyśmy,ł,ła,li,ły,any,ony,ący,ąca'.split(','),
      adjSuffs: 'ny,na,ne,owy,owa,owe,ski,ska,skie,iwy,iwa,iwe,awy,awa,awe,liwy,liwa,liwe,alny,elny'.split(','),
      advSuffs: 'o,e,ie,ko,ąco'.split(','),
      verbs: 'być,jestem,jesteś,jest,jesteśmy,jesteście,są,byłem,byłam,byłeś,byłaś,był,była,było,byliśmy,byłyśmy,byliście,byłyście,byli,były,będę,będziesz,będzie,będziemy,będziecie,będą,mieć,mam,masz,ma,mamy,macie,mają,miałem,miałam,miałeś,miałaś,miał,miała,miało,mieliśmy,miałyśmy,będę miał,chcieć,chcę,chcesz,chce,chcemy,chcecie,chcą,móc,mogę,możesz,może,możemy,możecie,mogą,robić,robię,robisz,robi,robimy,robicie,robią,mówić,mówię,mówisz,mówi,mówimy,mówicie,mówią,wiedzieć,wiem,wiesz,wie,wiemy,wiecie,wiedzą,znać,znam,znasz,zna,znamy,znacie,znają,myśleć,myślę,myślisz,myśli,myślimy,myślicie,myślą,jeść,jem,jesz,je,jemy,jecie,jedzą,pić,piję,pijesz,pije,pijemy,pijecie,piją,iść,idę,idziesz,idzie,idziemy,idziecie,idą'.split(','),
      adjs: 'dobry,zły,duży,mały,nowy,stary,młody,wysoki,niski,długi,krótki,dobry,zły,inny,ostatni,następny,ważny,łatwy,trudny,silny,słaby,szybki,wolny,ciepły,zimny,jasny,ciemny,biały,czarny,czerwony,niebieski,zielony,żółty,szczęśliwy,smutny,zły,prawdziwy,fałszywy,pewny,wolny,pełny,pusty,bogaty,biedny,gotowy,czysty,brudny,słodki,słony,świeży,spokojny,inteligentny,głupi,uprzejmy,uczciwy,zdolny,zmęczony,chory,zdrowy,lepszy,gorszy'.split(','),
      advs: 'nie,teraz,wtedy,tutaj,tam,tak,też,bardzo,prawie,już,zawsze,nigdy,czasami,często,zazwyczaj,jeszcze,wkrotce,późno,dziś,jutro,wczoraj,może,prawdopodobnie,z pewnością,absolutnie,jednak,zamiast tego,dość,więcej,mniej,lepiej,gorzej,jak,kiedy,gdzie,dlaczego,dobrze,źle,szybko,wolno,razem,sam,tylko,około,z przodu,z tyłu,na górze,na dole,w środku,na zewnątrz,blisko,daleko'.split(','),
      notVerbs: 'słońce,serce,miasto,drzewo,okno,ciasto,miejsce,słowo,zdanie,zadanie,pytanie,mieszkanie,śniadanie,obiad,obiadek'.split(','),
      notAdjs: 'hotel,model,parasol,telefon,balkon,melon,cytryna,godzina,dziewczyna,przyczyna'.split(','),
      notAdvs: 'słońce,serce,miasto,drzewo,okno,ciasto,miejsce,słowo,złoto,błoto,lato'.split(',')
    },

    pt: {
      pronouns: 'eu,tu,você,ele,ela,nós,vós,vocês,eles,elas,me,te,se,o,a,lhe,nos,vos,os,as,lhes,mim,ti,si,meu,teu,seu,nosso,vosso,minha,tua,sua,nossas,vossas,quem,que,qual,quais,cujo,cuja,este,esta,esse,essa,aquele,aquela,isto,isso,aquilo,alguém,algo,ninguém,nada,todos,cada,algum,nenhum'.split(','),
      verbSuffs: 'ar,er,ir,or,ando,endo,indo,ado,ido,ava,ia,ei,ou,aste,iste,iu,aram,eram,iram,ará,erá,irá,aria,eria,iria,asse,esse,isse,o,as,a,amos,em'.split(','),
      adjSuffs: 'oso,osa,ável,ível,al,ico,ica,ivo,iva,ário,ária,ento,enta,esco,esca,udo,uda,dor,dora,ante,ente,inte'.split(','),
      advSuffs: 'mente'.split(','),
      verbs: 'ser,sou,és,é,somos,são,era,eras,era,éramos,eram,fui,foste,foi,fomos,foram,estar,estou,estás,está,estamos,estão,ter,tenho,tens,tem,temos,têm,fazer,faço,fazes,faz,fazemos,fazem,dizer,digo,dizes,diz,dizemos,dizem,ir,vou,vais,vai,vamos,vão,vir,venho,vens,vem,vimos,vêm,poder,posso,podes,pode,podemos,podem,querer,quero,queres,quer,queremos,querem,saber,sei,sabes,sabe,sabemos,sabem,ver,vejo,vês,vê,vemos,vêem,dar,dou,dás,dá,damos,dão,pôr,ponho,pões,põe,pomos,põem,falar,falo,falas,fala,falamos,falam,comer,como,comes,come,comemos,comem,viver,vivo,vives,vive,vivemos,vivem'.split(','),
      adjs: 'bom,mau,grande,pequeno,novo,velho,jovem,alto,baixo,longo,curto,justo,errado,diferente,último,próximo,importante,fácil,difícil,forte,fraco,rápido,lento,quente,frio,claro,escuro,branco,preto,vermelho,azul,verde,amarelo,feliz,triste,zangado,verdadeiro,falso,seguro,livre,cheio,vazio,rico,pobre,pronto,limpo,sujo,doce,salgado,fresco,tranquilo,inteligente,estúpido,amável,honesto,capaz,cansado,doente,são,melhor,pior'.split(','),
      advs: 'não,agora,então,aqui,ali,assim,também,demasiado,muito,realmente,quase,já,sempre,nunca,às vezes,frequentemente,geralmente,ainda,logo,tarde,hoje,amanhã,ontem,talvez,provavelmente,certamente,absolutamente,contudo,portanto,em vez disso,bastante,mais,menos,melhor,pior,como,quando,onde,porquê,bem,mal,rápido,devagar,juntos,só,somente,cerca de,à frente,atrás,em cima,em baixo,dentro,fora,perto,longe'.split(','),
      notVerbs: 'mar,lugar,açúcar,melão,limão,sabão,coração,camião,botão,algodão,portão'.split(','),
      notAdjs: 'animal,canal,capital,criminal,festival,material,oficial,original,pessoal,principal,semanal,jornal,árvore,girassol,espanhol,controlo,petróleo'.split(','),
      notAdvs: 'mente,gente,ponte,fonte,dente,cliente,corrente,ambiente,acidente,presidente'.split(',')
    }
  };

  function getLK(lc){if(!lc)return'en';var l=lc.toLowerCase();if(l.indexOf('en')===0)return'en';if(l.indexOf('it')===0)return'it';if(l.indexOf('fr')===0)return'fr';if(l.indexOf('es')===0)return'es';if(l.indexOf('de')===0)return'de';if(l.indexOf('nl')===0)return'nl';if(l.indexOf('pl')===0)return'pl';if(l.indexOf('pt')===0)return'pt';return'en';}

  function detectPOS(word, langKey) {
    var r = RULES[langKey] || RULES['en'];
    var w = word.toLowerCase().replace(/[^a-zà-ÿ\u0100-\u024f']/g, '');
    if (!w || w.length < 2) return null;

    // 1) Pronouns — exact match
    if (r.pronouns.indexOf(w) !== -1) return 'pronoun';

    // 2) Explicit verb list (overrides suffix checks)
    if (r.verbs && r.verbs.indexOf(w) !== -1) return 'verb';
    // 3) Explicit adjective list
    if (r.adjs && r.adjs.indexOf(w) !== -1) return 'adj';
    // 4) Explicit adverb list
    if (r.advs && r.advs.indexOf(w) !== -1) return 'adv';

    // 5) Check NOT lists first — if word is in a not-list, skip that category
    var notV = (r.notVerbs && r.notVerbs.indexOf(w) !== -1);
    var notA = (r.notAdjs && r.notAdjs.indexOf(w) !== -1);
    var notD = (r.notAdvs && r.notAdvs.indexOf(w) !== -1);

    // 6) Verb suffixes
    if (!notV) {
      var vs = r.verbSuffs.slice().sort(function(a,b){return b.length-a.length;});
      for (var i=0; i<vs.length; i++) { if (w.length > vs[i].length+1 && w.endsWith(vs[i])) return 'verb'; }
    }
    // 7) Adjective suffixes
    if (!notA) {
      var as = r.adjSuffs.slice().sort(function(a,b){return b.length-a.length;});
      for (var i=0; i<as.length; i++) { if (w.length > as[i].length+1 && w.endsWith(as[i])) return 'adj'; }
    }
    // 8) Adverb suffixes
    if (!notD) {
      var ds = r.advSuffs.slice().sort(function(a,b){return b.length-a.length;});
      for (var i=0; i<ds.length; i++) { if (w.length > ds[i].length+1 && w.endsWith(ds[i])) return 'adv'; }
    }
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
