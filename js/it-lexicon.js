/* ═══════════════════════════════════════════════════════════════
   js/it-lexicon.js — Italian POS + CEFR (local, no network)
   ───────────────────────────────────────────────────────────────
   Settled source chain for Italian (see docs/ai/pos-cefr-sources.md):

   POS  : IT_POS map → suffix rules (itPosGuess) → Wiktionary parse → '—'
   CEFR : IT_CEFR map → suffix rules (itCefrGuess) → length fallback

   Italian morphology is far more regular than English, so suffix rules
   are genuinely reliable. English stays on CEFR_LEVELS + LEMMA_POS_MAP
   + /api/cefr/batch as before.
   ═══════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  /* ── Curated core lexicon (most frequent Italian words) ── */
  var IT_POS = {
    // function words
    "il":"FUNC","lo":"FUNC","la":"FUNC","i":"FUNC","gli":"FUNC","le":"FUNC","un":"FUNC","uno":"FUNC","una":"FUNC",
    "di":"FUNC","a":"FUNC","da":"FUNC","in":"FUNC","con":"FUNC","su":"FUNC","per":"FUNC","tra":"FUNC","fra":"FUNC",
    "e":"FUNC","ed":"FUNC","o":"FUNC","ma":"FUNC","se":"FUNC","che":"FUNC","chi":"FUNC","come":"FUNC","quando":"FUNC",
    "dove":"FUNC","perché":"FUNC","non":"FUNC","più":"FUNC","meno":"FUNC","molto":"FUNC","poco":"FUNC","qui":"FUNC",
    "qua":"FUNC","lì":"FUNC","là":"FUNC","io":"FUNC","tu":"FUNC","noi":"FUNC","voi":"FUNC","questo":"FUNC","quello":"FUNC",
    // core verbs (infinitive)
    "essere":"VERB","avere":"VERB","fare":"VERB","dire":"VERB","andare":"VERB","venire":"VERB","vedere":"VERB",
    "sapere":"VERB","potere":"VERB","volere":"VERB","dovere":"VERB","dare":"VERB","stare":"VERB","prendere":"VERB",
    "mettere":"VERB","parlare":"VERB","pensare":"VERB","trovare":"VERB","sentire":"VERB","capire":"VERB","chiedere":"VERB",
    "rispondere":"VERB","lavorare":"VERB","studiare":"VERB","mangiare":"VERB","bere":"VERB","dormire":"VERB",
    "arrivare":"VERB","partire":"VERB","restare":"VERB","rimanere":"VERB","diventare":"VERB","sembrare":"VERB",
    "credere":"VERB","conoscere":"VERB","aprire":"VERB","chiudere":"VERB","uscire":"VERB","entrare":"VERB",
    "chiamare":"VERB","aiutare":"VERB","cercare":"VERB","comprare":"VERB","pagare":"VERB","leggere":"VERB",
    "scrivere":"VERB","giocare":"VERB","vivere":"VERB","morire":"VERB","nascere":"VERB","piacere":"VERB",
    // core nouns
    "casa":"NOUN","giorno":"NOUN","anno":"NOUN","tempo":"NOUN","cosa":"NOUN","persona":"NOUN","uomo":"NOUN",
    "donna":"NOUN","bambino":"NOUN","figlio":"NOUN","madre":"NOUN","padre":"NOUN","famiglia":"NOUN","amico":"NOUN",
    "lavoro":"NOUN","scuola":"NOUN","città":"NOUN","paese":"NOUN","strada":"NOUN","acqua":"NOUN","pane":"NOUN",
    "vino":"NOUN","cibo":"NOUN","colazione":"NOUN","pranzo":"NOUN","cena":"NOUN","soldi":"NOUN","prezzo":"NOUN",
    "parola":"NOUN","nome":"NOUN","numero":"NOUN","parte":"NOUN","vita":"NOUN","mondo":"NOUN","mano":"NOUN",
    "occhio":"NOUN","testa":"NOUN","cuore":"NOUN","voce":"NOUN","storia":"NOUN","problema":"NOUN","domanda":"NOUN",
    "risposta":"NOUN","idea":"NOUN","ragione":"NOUN","modo":"NOUN","punto":"NOUN","volta":"NOUN","gente":"NOUN",
    "macchina":"NOUN","telefono":"NOUN","camera":"NOUN","letto":"NOUN","tavolo":"NOUN","sedia":"NOUN","porta":"NOUN",
    "finestra":"NOUN","libro":"NOUN","giornale":"NOUN","film":"NOUN","musica":"NOUN","sport":"NOUN","viaggio":"NOUN",
    "vacanza":"NOUN","festa":"NOUN","regalo":"NOUN","mese":"NOUN","settimana":"NOUN","notte":"NOUN","mattina":"NOUN",
    "sera":"NOUN","pomeriggio":"NOUN","minuto":"NOUN","ora":"NOUN","medico":"NOUN","ospedale":"NOUN","salute":"NOUN",
    "lingua":"NOUN","italiano":"NOUN","inglese":"NOUN","lezione":"NOUN","esame":"NOUN","studente":"NOUN",
    "professore":"NOUN","azienda":"NOUN","ufficio":"NOUN","capo":"NOUN","collega":"NOUN","riunione":"NOUN",
    "progetto":"NOUN","mercato":"NOUN","negozio":"NOUN","ristorante":"NOUN","albergo":"NOUN","biglietto":"NOUN",
    "treno":"NOUN","aereo":"NOUN","nave":"NOUN","mare":"NOUN","montagna":"NOUN","sole":"NOUN","pioggia":"NOUN",
    // core adjectives
    "bello":"ADJ","brutto":"ADJ","buono":"ADJ","cattivo":"ADJ","grande":"ADJ","piccolo":"ADJ","alto":"ADJ","basso":"ADJ",
    "nuovo":"ADJ","vecchio":"ADJ","giovane":"ADJ","vecchia":"ADJ","lungo":"ADJ","corto":"ADJ","facile":"ADJ",
    "difficile":"ADJ","possibile":"ADJ","importante":"ADJ","felice":"ADJ","triste":"ADJ","stanco":"ADJ","malato":"ADJ",
    "sano":"ADJ","caldo":"ADJ","freddo":"ADJ","pieno":"ADJ","vuoto":"ADJ","pronto":"ADJ","libero":"ADJ",
    "occupato":"ADJ","caro":"ADJ","economico":"ADJ","veloce":"ADJ","lento":"ADJ","forte":"ADJ","debole":"ADJ",
    "giusto":"ADJ","sbagliato":"ADJ","diverso":"ADJ","uguale":"ADJ","stesso":"ADJ","primo":"ADJ","ultimo":"ADJ",
    "prossimo":"ADJ","vero":"ADJ","falso":"ADJ","chiaro":"ADJ","scuro":"ADJ","pulito":"ADJ","sporco":"ADJ",
    // core adverbs
    "bene":"ADV","male":"ADV","oggi":"ADV","domani":"ADV","ieri":"ADV","adesso":"ADV","ora":"ADV","sempre":"ADV",
    "mai":"ADV","spesso":"ADV","dopo":"ADV","prima":"ADV","insieme":"ADV","solo":"ADV","anche":"ADV","già":"ADV"
  };

  var IT_CEFR = {
    // A1 — articles, prepositions, pronouns, basic verbs/nouns
    "il":"A1","lo":"A1","la":"A1","i":"A1","gli":"A1","le":"A1","un":"A1","una":"A1",
    "di":"A1","a":"A1","da":"A1","in":"A1","con":"A1","su":"A1","per":"A1","tra":"A1","fra":"A1",
    "e":"A1","o":"A1","ma":"A1","se":"A1","che":"A1","come":"A1","non":"A1","sì":"A1","no":"A1",
    "io":"A1","tu":"A1","noi":"A1","voi":"A1","questo":"A1","quello":"A1","qui":"A1","dove":"A1",
    "essere":"A1","avere":"A1","fare":"A1","andare":"A1","venire":"A1","stare":"A1","dare":"A1",
    "dire":"A1","vedere":"A1","volere":"A1","potere":"A1","dovere":"A1",
    "casa":"A1","giorno":"A1","anno":"A1","tempo":"A1","cosa":"A1","persona":"A1","uomo":"A1",
    "donna":"A1","bambino":"A1","figlio":"A1","madre":"A1","padre":"A1","famiglia":"A1","amico":"A1",
    "acqua":"A1","pane":"A1","cibo":"A1","soldi":"A1","nome":"A1","numero":"A1","città":"A1",
    "strada":"A1","scuola":"A1","lavoro":"A1","libro":"A1","lingua":"A1","italiano":"A1",
    "bello":"A1","brutto":"A1","buono":"A1","grande":"A1","piccolo":"A1","nuovo":"A1","vecchio":"A1",
    "giovane":"A1","alto":"A1","basso":"A1","lungo":"A1","corto":"A1","facile":"A1","difficile":"A1",
    "caldo":"A1","freddo":"A1","bene":"A1","male":"A1","oggi":"A1","domani":"A1","ieri":"A1",
    // A2 — everyday verbs/nouns
    "sapere":"A2","prendere":"A2","mettere":"A2","parlare":"A2","pensare":"A2","trovare":"A2",
    "sentire":"A2","capire":"A2","chiedere":"A2","rispondere":"A2","mangiare":"A2","bere":"A2",
    "dormire":"A2","arrivare":"A2","partire":"A2","restare":"A2","diventare":"A2","credere":"A2",
    "aprire":"A2","chiudere":"A2","uscire":"A2","entrare":"A2","chiamare":"A2","aiutare":"A2",
    "cercare":"A2","comprare":"A2","pagare":"A2","leggere":"A2","scrivere":"A2","giocare":"A2",
    "vivere":"A2","viaggio":"A2","vacanza":"A2","festa":"A2","regalo":"A2","mese":"A2",
    "settimana":"A2","notte":"A2","mattina":"A2","sera":"A2","minuto":"A2","ora":"A2",
    "colazione":"A2","pranzo":"A2","cena":"A2","prezzo":"A2","parola":"A2","parte":"A2",
    "mondo":"A2","mano":"A2","occhio":"A2","testa":"A2","cuore":"A2","voce":"A2",
    "macchina":"A2","telefono":"A2","camera":"A2","letto":"A2","tavolo":"A2","sedia":"A2",
    "porta":"A2","finestra":"A2","film":"A2","musica":"A2","sport":"A2","negozio":"A2",
    "ristorante":"A2","albergo":"A2","biglietto":"A2","treno":"A2","aereo":"A2","mare":"A2",
    "sole":"A2","pioggia":"A2","stanco":"A2","pieno":"A2","vuoto":"A2","pronto":"A2",
    "caro":"A2","veloce":"A2","lento":"A2","forte":"A2","debole":"A2","giusto":"A2",
    "diverso":"A2","uguale":"A2","stesso":"A2","primo":"A2","ultimo":"A2","chiaro":"A2",
    "pulito":"A2","sporco":"A2","adesso":"A2","sempre":"A2","mai":"A2","spesso":"A2",
    // B1 — intermediate
    "sembrare":"B1","conoscere":"B1","piacere":"B1","storia":"B1","problema":"B1","domanda":"B1",
    "risposta":"B1","idea":"B1","ragione":"B1","modo":"B1","punto":"B1","volta":"B1",
    "azienda":"B1","ufficio":"B1","capo":"B1","collega":"B1","riunione":"B1","progetto":"B1",
    "mercato":"B1","medico":"B1","ospedale":"B1","salute":"B1","lezione":"B1","esame":"B1",
    "studente":"B1","professore":"B1","inglese":"B1","importante":"B1","possibile":"B1",
    "felice":"B1","triste":"B1","libero":"B1","occupato":"B1","economico":"B1",
    "dopo":"B1","prima":"B1","insieme":"B1","solo":"B1"
  };

  /* ── Italian suffix rules — very reliable for Italian morphology ── */
  function itPosGuess(w) {
    w = (w || '').toLowerCase().replace(/[^a-zàèéìòù]/g, '');
    if (!w || w.length < 2) return '—';
    if (IT_POS[w]) return IT_POS[w];
    // adverbs — must check before adjectives (otherwise 'veramente' hits noun rules)
    if (/mente$/.test(w)) return 'ADV';
    // verbs — infinitive + gerund
    if (/are$|ere$|ire$/.test(w)) return 'VERB';
    if (/ando$|endo$/.test(w)) return 'VERB';
    // nouns — heavy nominal suffixes
    if (/zione$|zioni$|mento$|menti$|ità$|ezza$|anza$|enza$|tudine$|udine$|tore$|trice$|ismo$/.test(w)) return 'NOUN';
    // adjectives — participial + adjectival suffixes
    if (/ato$|ata$|ati$|ate$|uto$|uta$|uti$|ute$|ito$|ita$|iti$|ite$/.test(w)) return 'ADJ';
    if (/oso$|osa$|osi$|ose$|ivo$|iva$|ivi$|ive$|ico$|ica$|ici$|iche$|abile$|ibile$|evole$|istico$|istica$|issimo$|issima$|issimi$|issime$/.test(w)) return 'ADJ';
    return '—';
  }

  function itCefrGuess(w) {
    w = (w || '').toLowerCase().replace(/[^a-zàèéìòù]/g, '');
    if (!w || w.length < 2) return 'A2';
    if (IT_CEFR[w]) return IT_CEFR[w];
    // function-word-like short forms
    if (/^(il|lo|la|i|gli|le|un|uno|una|di|a|da|in|con|su|per|tra|fra|e|o|ma|se|che|chi|non|sì|no|io|tu)$/.test(w)) return 'A1';
    // very common morphology → B1 band
    if (/mente$/.test(w)) return 'B1';
    if (/zione$|zioni$|mento$|menti$|ità$|ando$|endo$/.test(w)) return 'B1';
    // advanced nominal suffixes → B2
    if (/ezza$|anza$|enza$|tudine$|udine$|ismo$|istico$|istica$|evole$|ibile$/.test(w)) return 'B2';
    // base verb infinitives + participles → A2
    if (/are$|ere$|ire$/.test(w)) return 'A2';
    if (/ato$|ata$|ati$|ate$|uto$|uta$|uti$|ute$|ito$|ita$|iti$|ite$/.test(w)) return 'A2';
    if (/oso$|osa$|osi$|ose$|ivo$|iva$|ivi$|ive$|ico$|ica$|ici$|iche$|issimo$|issima$|issimi$|issime$/.test(w)) return 'B1';
    // length fallback (Italian words run longer than English)
    if (w.length <= 4) return 'A1';
    if (w.length <= 6) return 'A2';
    if (w.length <= 8) return 'B1';
    if (w.length <= 10) return 'B2';
    return 'C1';
  }

  /* ── Unified helpers (single entry point for the whole app) ── */
  function getPOS(word, lang) {
    if (lang === 'it') {
      var p = itPosGuess(word);
      return p === '—' ? '—' : p;
    }
    // English chain: LEMMA_POS_MAP → callers add Penn/Datamuse/API enrichment
    var key = (word || '').toLowerCase();
    if (window.LEMMA_POS_MAP && window.LEMMA_POS_MAP[key]) return window.LEMMA_POS_MAP[key];
    return '—';
  }

  function getCEFR(word, lang) {
    var key = (word || '').toLowerCase();
    if (lang === 'it') return itCefrGuess(key);
    // English chain: CEFR_LEVELS → caller adds /api/cefr/batch → length heuristic
    if (window.CEFR_LEVELS && window.CEFR_LEVELS[key]) return window.CEFR_LEVELS[key];
    var len = key.length;
    if (len <= 4) return 'A1';
    if (len <= 6) return 'A2';
    if (len <= 8) return 'B1';
    if (len <= 10) return 'B2';
    return 'C1';
  }

  window.S8T_IT_LEXICON = {
    IT_POS: IT_POS,
    IT_CEFR: IT_CEFR,
    itPosGuess: itPosGuess,
    itCefrGuess: itCefrGuess,
    getPOS: getPOS,
    getCEFR: getCEFR
  };
})();
