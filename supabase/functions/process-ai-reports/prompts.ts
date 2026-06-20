// AI Analysis Module Prompts — multilingual, language-agnostic
// Auto-detect transcript language. Output language comes from user preferences.
// Never apologize for the transcript language — just analyze what's there.

function sharedRules(reportLanguage: string): string {
  return `
Regole generali:
- Rileva automaticamente la lingua del transcript e analizzala in quella lingua.
- NON scusarti per la lingua del transcript. Non dire "il transcript è in italiano quindi…". Analizza semplicemente ciò che c'è.
- Scrivi il report in ${reportLanguage}.
- Includi esempi tratti dal transcript nella lingua originale, poi commentali in ${reportLanguage}.
- Sii specifico, concreto e utile. Evita frasi generiche.
- Usa la scala CEFR (A1-C2) dove richiesto — è valida per tutte le lingue europee.
- Formatta il responso in modo chiaro, con sezioni numerate.
`;
}

export const MODULE_PROMPTS: Record<number, { system: (reportLang: string) => string; user: (transcript: string, reportLang: string) => string }> = {

  // ═══ CAMBRIDGE-STYLE (1-4): Grammar, Vocabulary, Fluency, Pronunciation ═══

  1: {
    system: (rl: string) => `Sei un esperto valutatore linguistico specializzato in grammatica e accuratezza (Grammatical Range & Accuracy). Lavori con qualsiasi lingua.${sharedRules(rl)}`,
    user: (transcript: string, rl: string) => `Analizza questo transcript per Gamma e Accuratezza Grammaticale:

${transcript}

Scrivi il report in ${rl}. Fornisci:
1. Gamma Grammaticale (varietà di strutture usate: tempi verbali, modi, subordinate, costruzioni complesse)
2. Accuratezza (frequenza e tipo di errori grammaticali)
3. Errori Specifici — elenca errori concreti con la correzione
4. Punti di Forza identificati
5. Raccomandazioni mirate per migliorare
6. Stima del Livello CEFR (A1-C2)`
  },

  2: {
    system: (rl: string) => `Sei un esperto valutatore linguistico specializzato in risorse lessicali (Lexical Resource). Lavori con qualsiasi lingua.${sharedRules(rl)}`,
    user: (transcript: string, rl: string) => `Analizza questo transcript per Ricchezza Lessicale:

${transcript}

Scrivi il report in ${rl}. Fornisci:
1. Punteggio di Gamma Lessicale (varietà e sofisticazione del vocabolario)
2. Vocabolario Tematico — parole ed espressioni legate agli argomenti trattati
3. Collocazioni e Frasi Fatte identificate
4. Parole/Espressioni Abusate o ripetute eccessivamente
5. Lacune Lessicali — cosa manca per esprimersi con più precisione
6. Raccomandazioni per espandere il vocabolario
7. Stima del Livello CEFR (A1-C2)`
  },

  3: {
    system: (rl: string) => `Sei un esperto valutatore linguistico specializzato in fluidità e coerenza (Fluency & Coherence). Lavori con qualsiasi lingua.${sharedRules(rl)}`,
    user: (transcript: string, rl: string) => `Analizza questo transcript per Fluidità e Coerenza:

${transcript}

Scrivi il report in ${rl}. Fornisci:
1. Punteggio di Fluidità (ritmo, esitazioni, pause apparenti)
2. Coerenza (organizzazione logica, connettivi discorsivi)
3. Esempi specifici dal transcript
4. Raccomandazioni per migliorare
5. Stima del Livello CEFR (A1-C2)`
  },

  4: {
    system: (rl: string) => `Sei un esperto valutatore linguistico specializzato in pronuncia e tratti fonetici. Lavori con qualsiasi lingua.${sharedRules(rl)}`,
    user: (transcript: string, rl: string) => `Analizza questo transcript per tratti di Pronuncia:

${transcript}

Scrivi il report in ${rl}. Fornisci:
1. Intelligibilità stimata (basata su pattern testuali)
2. Pattern di Intonazione e Accento
3. Suoni o pattern potenzialmente problematici
4. Problemi di accento di parola/frase
5. Raccomandazioni per migliorare la pronuncia
6. Stima del Livello CEFR (A1-C2)

Nota: L'analisi si basa su pattern testuali, non audio.`
  },

  // ═══ BUSINESS (5-7): Professional, Meetings, Business Vocab ═══

  5: {
    system: (rl: string) => `Sei un esperto di comunicazione professionale e linguaggio aziendale. Lavori con qualsiasi lingua.${sharedRules(rl)}`,
    user: (transcript: string, rl: string) => `Analizza questo transcript per Comunicazione Professionale:

${transcript}

Scrivi il report in ${rl}. Fornisci:
1. Appropriatezza del Registro (formale vs informale)
2. Tono Professionale
3. Uso del Vocabolario Business/settoriale
4. Chiarezza e Concisione
5. Sicurezza e Assertività comunicativa
6. Raccomandazioni per contesti professionali`
  },

  6: {
    system: (rl: string) => `Sei un coach di comunicazione aziendale specializzato in riunioni e presentazioni. Lavori con qualsiasi lingua.${sharedRules(rl)}`,
    user: (transcript: string, rl: string) => `Analizza questo transcript per Riunioni e Presentazioni:

${transcript}

Scrivi il report in ${rl}. Fornisci:
1. Tecniche di apertura e chiusura
2. Gestione dei turni di parola e interruzioni
3. Capacità di persuasione e argomentazione
4. Efficacia del linguaggio di segnalazione (signposting)
5. Gestione delle domande
6. Consigli pratici per la comunicazione professionale`
  },

  7: {
    system: (rl: string) => `Sei un esperto di vocabolario aziendale e terminologia di settore. Lavori con qualsiasi lingua.${sharedRules(rl)}`,
    user: (transcript: string, rl: string) => `Analizza questo transcript per Vocabolario Business:

${transcript}

Scrivi il report in ${rl}. Fornisci:
1. Uso di terminologia specifica del settore
2. Modi di dire ed espressioni idiomatiche professionali
3. Linguaggio commerciale/finanziario
4. Registro formale vs informale in contesto aziendale
5. Suggerimenti per espandere il lessico professionale
6. Confronto con standard di comunicazione aziendale`
  },

  // ═══ ACADEMIC (8-10): Discourse, Research, Academic Vocab ═══

  8: {
    system: (rl: string) => `Sei un esperto di discorso accademico e analisi del linguaggio formale. Lavori con qualsiasi lingua.${sharedRules(rl)}`,
    user: (transcript: string, rl: string) => `Analizza questo transcript per Discorso Accademico:

${transcript}

Scrivi il report in ${rl}. Fornisci:
1. Uso di hedging e qualificatori accademici (forse, probabilmente, sembrerebbe...)
2. Citazioni e riferimenti nel parlato
3. Pensiero critico e argomentazione
4. Espressione di idee astratte e complesse
5. Bilanciamento tra linguaggio oggettivo e soggettivo`
  },

  9: {
    system: (rl: string) => `Sei un esperto di comunicazione accademica e ricerca. Lavori con qualsiasi lingua.${sharedRules(rl)}`,
    user: (transcript: string, rl: string) => `Analizza questo transcript per Comunicazione di Ricerca:

${transcript}

Scrivi il report in ${rl}. Fornisci:
1. Chiarezza nella descrizione metodologica
2. Presentazione di risultati e dati
3. Discussione di limitazioni e implicazioni
4. Accuratezza della terminologia tecnica
5. Capacità di rispondere a domande accademiche
6. Raccomandazioni per lo sviluppo accademico`
  },

  10: {
    system: (rl: string) => `Sei un esperto di vocabolario accademico e terminologia specialistica. Lavori con qualsiasi lingua.${sharedRules(rl)}`,
    user: (transcript: string, rl: string) => `Analizza questo transcript per Vocabolario Accademico:

${transcript}

Scrivi il report in ${rl}. Fornisci:
1. Copertura del vocabolario accademico (equivalenti AWL nella lingua del transcript)
2. Terminologia specifica della materia
3. Uso di nomi astratti
4. Pattern di nominalizzazione
5. Mantenimento del registro formale
6. Confronto con standard accademici`
  },

  // ═══ LINGUISTIC (11-14): Discourse, Syntax, Lexical Stats, Fillers ═══

  11: {
    system: (rl: string) => `Sei un linguista esperto in analisi del discorso e coesione testuale. Lavori con qualsiasi lingua.${sharedRules(rl)}`,
    user: (transcript: string, rl: string) => `Analizza questo transcript per Analisi del Discorso:

${transcript}

Scrivi il report in ${rl}. Fornisci:
1. Uso di marcatori discorsivi e connettivi (per italiano: quindi, però, infatti, comunque; per altre lingue: equivalenti locali)
2. Dispositivi di coesione e coerenza
3. Gestione e sviluppo dei temi/topic
4. Pattern di riferimento ed ellissi
5. Tratti pragmatici (cortesia, indirectness, implicature)`
  },

  12: {
    system: (rl: string) => `Sei un linguista computazionale esperto in misurazione della complessità linguistica. Lavori con qualsiasi lingua.${sharedRules(rl)}`,
    user: (transcript: string, rl: string) => `Analizza questo transcript per Sintassi e Complessità:

${transcript}

Scrivi il report in ${rl}. Fornisci:
1. Variazione della lunghezza delle frasi
2. Tipi di clausole e subordinazione
3. Indice di complessità sintattica
4. Distribuzione voce attiva vs passiva
5. Bilanciamento tra coordinazione e subordinazione
6. Metriche quantitative (conteggi, medie, rapporti)`
  },

  13: {
    system: (rl: string) => `Sei un esperto di statistica lessicale e analisi quantitative del linguaggio. Lavori con qualsiasi lingua.${sharedRules(rl)}`,
    user: (transcript: string, rl: string) => `Esegui un'Analisi Lessicale Quantitativa su questo transcript:

${transcript}

Scrivi il report in ${rl}. Fornisci:
1. Rapporto type-token (TTR) e sua interpretazione
2. Densità lessicale
3. Distribuzione della frequenza delle parole
4. Campi semantici e domini
5. Indici di sofisticazione lessicale
6. Raccomandazioni per lo sviluppo del vocabolario`
  },

  14: {
    system: (rl: string) => `Sei un analista della conversazione esperto in disfluenze e pianificazione del parlato. Lavori con qualsiasi lingua — ogni lingua ha i propri riempitivi caratteristici.${sharedRules(rl)}`,
    user: (transcript: string, rl: string) => `Analizza questo transcript per Fillers e Disfluenze:

${transcript}

Scrivi il report in ${rl}. Fornisci:
1. Distribuzione dei riempitivi (per l'italiano: quindi, allora, cioè, tipo, ecc; per inglese: um, uh, like, you know; per olandese: dus, nou, eigenlijk, zeg maar; per altre lingue: i riempitivi caratteristici)
2. False partenze e auto-correzioni
3. Pattern di pausa (stimati dal transcript)
4. Tipi di ripetizione identificati
5. Disfluenze strategiche vs problematiche — quali aiutano la pianificazione e quali disturbano
6. Il metric fillers_per_minute è già calcolato — contestualizzalo e interpretalo`
  }
};

export function getModulePrompt(moduleId: number, reportLanguage?: string): { system: string; user: (transcript: string) => string } {
  const prompt = MODULE_PROMPTS[moduleId];
  if (!prompt) {
    throw new Error(`No prompt defined for module ID ${moduleId}`);
  }
  const rl = reportLanguage || 'italiano';
  const sys = prompt.system(rl);
  return {
    system: sys,
    user: (transcript: string) => prompt.user(transcript, rl)
  };
}
