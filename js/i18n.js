/* ═══ Sottotitoli i18n — Italian/English translations ═══ */
(function(){
  'use strict';

  var DICT = {
    it: {
      // ── Topbar ──
      "start_session": "Start Session",
      "start": "Start",
      "dark": "Dark",
      "light": "Light",
      "no_notifications": "Nessuna notifica recente",
      "minutes": "Minuti",
      "credits_report": "Crediti report",
      "buy_credits": "Acquista crediti",
      "settings": "Impostazioni",
      "help": "Aiuto",
      "logout": "Esci",
      "saved_sessions": "Sessioni salvate",
      "saved_reports": "Report salvati",
      "home": "Home",
      "panoramica": "Panoramica",
      "language": "Lingua",

      // ── Sidebar ──
      "study_language": "Lingua studio",
      "insights": "Insights",
      "word_banks": "Word banks",
      "vocabolario": "Vocabolario",
      "grammatica": "Grammatica",
      "trascrizioni": "Trascrizioni",
      "report_ai": "Report AI",
      "invita": "Invita",
      "profilo": "Profilo",
      "aiuto": "Aiuto",
      "trial_ends": "Trial ends in",
      "days": "giorni",
      "upgrade_pro": "Upgrade to Pro",
      "pro": "Pro",

      // ── Panoramica ──
      "welcome_back": "Ben tornato,",
      "login_to_see_stats": "Accedi per vedere le tue statistiche.",
      "your_stats_ready": "Le tue statistiche di apprendimento sono pronte.",
      "start_session_btn": "Inizia sessione",
      "total_sessions": "Sessioni totali",
      "spoken_time": "Tempo parlato",
      "unique_words": "Parole uniche",
      "avg_wpm": "WPM medio",
      "lexical_diversity": "Diversità lessicale",
      "ai_reports_generated": "Report AI generati",
      "generate_report": "Genera report →",
      "daily_minutes": "Minuti giornalieri",
      "completion": "Completamento",
      "monthly_goal": "obiettivo mensile",
      "last_30d": "ultimi 30gg",
      "cefr_distribution": "Distribuzione CEFR",
      "loading": "Caricamento...",
      "complete_sessions_cefr": "Completa alcune sessioni per vedere la distribuzione CEFR del tuo vocabolario.",
      "total_vocabulary": "Vocabolario totale",
      "words": "parole",
      "click_to_edit": "clicca per modificare",

      // ── Insights ──
      "objectives": "Obiettivi",
      "tasks": "Compiti",
      "milestones": "Traguardi",
      "estimated_level": "Livello stimato",
      "short_term_objective": "Obiettivo a breve termine",
      "habits": "Abitudini",
      "no_sessions_insights": "Nessuna sessione registrata. Inizia a parlare!",
      "based_on_sessions": "Basato su",
      "sessions_registered": "sessioni registrate.",
      "based_on_words": "Basato su",
      "words_in_vocab": "parole nel tuo vocabolario.",
      "dominant_level": "Livello dominante:",
      "define_objective": "Definisci un obiettivo nel tuo Profilo Linguistico per monitorare i progressi.",
      "active_tasks": "Compiti attivi",
      "add_task": "Aggiungi",
      "recently_completed": "Completati di recente",
      "achieved_milestones": "Traguardi raggiunti",
      "in_progress": "In corso",
      "no_milestones": "Nessun traguardo ancora. Continua a parlare!",
      "all_achieved": "Tutti i traguardi raggiunti! 🎉",
      "new_task": "Nuovo compito...",
      "no_tasks": "Nessun compito. Aggiungine uno!",
      "doing": "In corso",
      "todo": "Da fare",
      "done": "Completato",
      "preferred_time": "Orario preferito",
      "most_active_day": "Giorno più attivo",
      "of_sessions": "delle sessioni",
      "daily_average": "Media giornaliera",
      "delete_task": "Elimina compito",

      // ── Grammatica ──
      "grammar_panoramica": "Panoramica",
      "verb_tenses": "Tempi Verbali",
      "pronouns": "Pronomi",
      "errors": "Errori",
      "nouns": "Nouns",
      "verbs": "Verbs",
      "adjectives": "Adjectives",
      "negations": "Negazioni",
      "complexity": "Complessità delle frasi",
      "grammar_coming_soon": "I dati grammaticali saranno disponibili dopo l'analisi delle tue sessioni.",
      "no_transcripts_grammar": "Nessuna trascrizione disponibile. Completa una sessione di caption in inglese.",
      "grammar_en_only": "La grammatica è disponibile solo per sessioni in inglese.",
      "nlp_loading": "Libreria NLP in caricamento...",
      "analysis_based_on": "Analisi basata su",
      "and": "e",
      "total_words_analysis": "parole totali.",
      "avg_sentence_length": "Lunghezza media:",
      "words_per_sentence": "parole per frase.",
      "questions_asked": "Hai fatto",
      "questions": "domande",
      "good_complexity": "Buona complessità! Per passare a C1, punta a 12+ parole per frase.",
      "improve_complexity": "Per migliorare, cerca di costruire frasi più articolate con subordinate e connettivi.",
      "present": "Present",
      "past": "Past",
      "future": "Future (will)",
      "perfect": "Present Perfect",
      "conditional": "Conditional",
      "passive": "Passive",
      "gerund": "Gerund",
      "top_pronouns": "Top pronomi usati",
      "distribution": "Distribuzione",
      "subject": "soggetto",
      "object": "oggetto",
      "possessive": "possessivi",
      "error_patterns": "Pattern di errori rilevati",
      "no_errors": "Nessun errore comune rilevato nelle tue trascrizioni. Continua così! 🎉",
      "occurrences": "occorrenze",

      // ── Vocabolario ──
      "vocab_panoramica": "Panoramica",
      "cefr": "CEFR",
      "vocab_words": "Parole",
      "media_usage": "Media utilizzi",
      "ngsl_coverage": "Copertura NGSL",
      "common_words": "parole comuni",
      "per_word": "per parola",
      "status_current": "Stato attuale",
      "next_steps": "Prossimi Passi",
      "expand_b2": "Espandi lessico B2",
      "technical_words": "Parole tecniche",
      "read_articles": "Leggi 3 articoli/settimana",
      "cefr_distribution_title": "Distribuzione per livello",
      "your_vocab_count": "Il tuo vocabolario conta",
      "unique_words_count": "parole uniche",
      "every_session_enriches": "Ogni sessione arricchisce il tuo lessico.",
      "search_word": "Cerca parola...",
      "all": "Tutte",
      "type": "Tipo",
      "uses": "Usi",
      "last_used": "Ultima",

      // ── Word Banks ──
      "no_banks": "Nessuna banca",
      "create_first_bank": "Crea la tua prima banca di parole per organizzare il vocabolario che vuoi imparare.",
      "new_bank": "Nuova banca",
      "add_word": "Aggiungi parola...",
      "add": "Aggiungi",
      "expand": "espandi",

      // ── Trascrizioni ──
      "select_all": "Seleziona tutte",
      "delete_selected": "Elimina selezionate",
      "favorites": "Preferiti",
      "info": "Informazioni",
      "session": "Sessione",
      "words_count": "Parole",
      "date": "Data",
      "quality": "Qualità",
      "no_sessions": "Nessuna sessione registrata",
      "rename_info": "Puoi rinominare qualsiasi sessione cliccando sul menu",
      "pdf_info": "Per salvare una trascrizione come PDF, apri il menu e scegli Scarica PDF.",
      "analysis_info": "Per un'analisi approfondita di grammatica, vocabolario e fluidità, vai alla tab",

      // ── Report AI ──
      "create_report": "Crea Report",
      "my_reports": "I miei Report",
      "ai_settings": "Impostazioni",
      "quick_snapshot": "Snapshot rapido",
      "snapshot_desc": "Analisi immediata dell'ultima sessione. Gratuito una volta al giorno.",
      "generate_snapshot": "Genera Snapshot",
      "full_report": "Report completo",
      "full_report_desc": "Analisi approfondita su grammatica, vocabolario, fluidità e interferenze. Consuma 1 credito.",
      "generate_report_btn": "Genera Report · 1 credito",
      "credits_available": "crediti disponibili. Scalati solo a report completato.",
      "ai_preferences": "Preferenze AI",
      "focus": "Focus",
      "feedback_tone": "Tono feedback",
      "register": "Registro",
      "credits": "Crediti",

      // ── Profilo ──
      "general": "Generale",
      "linguistic_profile": "Profilo Linguistico",
      "preferences": "Preferenze",
      "member_since": "Membro da",
      "plan": "Piano",
      "native_language": "Lingua madre",
      "interface_language": "Lingua interfaccia",
      "activity": "Attività",
      "hours_spoken": "Ore parlate",
      "consecutive_days": "Giorni consecutivi",
      "why_study": "Perché studi questa lingua?",
      "use_situations": "In quali situazioni la usi?",
      "multi_select": "seleziona più opzioni",
      "your_sector": "Qual è il tuo settore?",
      "your_level": "Come valuti il tuo livello attuale?",
      "short_term_goal": "Obiettivo a breve termine",
      "save_profile": "Salva profilo",
      "saved": "Salvato",
      "go_to_linguistic_profile": "Vai a Profilo Linguistico",
      "profile_help_text": "Rispondi alle domande di Profilo Linguistico per aiutare i Report AI a essere più precisi. Più il tuo profilo è completo, più i consigli rispecchieranno il tuo contesto reale: settore, obiettivi e livello.",
      "language_settings": "Lingua",
      "appearance": "Aspetto",
      "theme": "Tema",
      "font_preference": "Preferenza font",
      "notifications": "Notifiche",
      "ai_report_ready": "Report AI pronto",
      "goals_reached": "Obiettivi raggiunti",
      "newsletter": "Newsletter",
      "active": "Attive",
      "disabled": "Disattivata",
      "save_preferences": "Salva preferenze",
      "account": "Account",
      "name": "Nome",
      "email": "Email",
      "privacy": "Privacy",
      "session_data": "Dati sessione",

      // ── Invita ──
      "invite_link": "Link",
      "invite_credits": "Crediti",
      "share_link": "Condividi il link",
      "referral_code": "Codice referral",
      "invite_status": "Stato inviti",
      "invited": "Invitati",
      "active_invites": "Attivo",
      "earned": "Guadagnati",
      "copy": "Copia",

      // ── Impostazioni ──
      "save_settings": "Salva impostazioni",
      "website_language": "Lingua del sito",
      "anonymous_sharing_label": "Condivisione anonima",
      "saved_check": "✓ Salvato",
      "privacy_sessions_info": "Quando attivo, le tue sessioni (trascrizioni, parole, metriche) vengono salvate su Supabase e compaiono nella tab Trascrizioni. Disattiva se preferisci non conservare lo storico.",
      "privacy_anon_info": "Se attivo, dati anonimi sulle tue sessioni (mai il contenuto delle trascrizioni) possono essere usati per migliorare i modelli di analisi. Nessun dato personale viene mai condiviso.",
      "your_name": "Il tuo nome",

      // ── Start Session ──
      "caption": "Caption",
      "translate": "Translate",
      "caption_desc": "Sottotitoli in una sola lingua",
      "caption_sub": "Scegli la lingua e avvia i sottotitoli in tempo reale.",
      "translate_desc": "Traduzione in tempo reale",
      "translate_sub": "Scegli la lingua che parli e quella per i sottotitoli.",
      "start_caption": "Avvia Caption",
      "start_translate": "Avvia Traduzione",
      "choose_language": "Scegli la lingua",
      "confirm": "Conferma",
      "spoken": "parlato",
      "subtitles": "sottotitoli",
      "click_to_change": "clicca per cambiare",
      "i_speak": "Io parlo in…",

      // ── AI Reports settings ──
      "precision_vocab": "Precisione, Vocabolario",
      "grammar_errors_opt": "Grammatica, Errori",
      "fluency_pronunciation": "Fluidità, Pronuncia",
      "comprehension_interference": "Comprensione, Interferenze",
      "complete_all": "Completo (tutti gli aspetti)",
      "encouraging": "Incoraggiante",
      "direct": "Diretto",
      "analytical": "Analitico",
      "balanced": "Bilanciato",
      "professional": "Professionale",
      "informal": "Informale",
      "academic": "Accademico",
      "technical": "Tecnico",
      "standard": "Standard",
      "standard_plan": "Standard",
      "free": "Gratuito",
      "free_plan": "Gratuito",

      // ── Profilo Linguistico chips ──
      "work": "Lavoro",
      "study": "Studio",
      "travel": "Viaggi",
      "conversation": "Conversazione",
      "exams": "Esami",
      "relocation": "Trasferimento",
      "film_content": "Film e contenuti",
      "meetings": "Riunioni",
      "emails": "Email",
      "presentations": "Presentazioni",
      "phone_calls": "Telefonate",
      "social": "Sociale",
      "reading": "Lettura",
      "engineering": "Ingegneria",
      "business": "Business",
      "design": "Design",
      "marketing": "Marketing",
      "healthcare": "Sanità",
      "education": "Istruzione",
      "technology": "Tecnologia",
      "a1_beginner": "A1 · Principiante",
      "a2_elementary": "A2 · Base",
      "b1_intermediate": "B1 · Intermedio",
      "b2_advanced": "B2 · Avanzato",
      "c1_fluent": "C1 · Fluente",
      "c2_mastery": "C2 · Padronanza",

      // ── FAQ ──
      "faq_subtitle": "Domande frequenti sul sistema di report, crediti, e sull'affidabilità delle analisi.",
      "faq_q1": "Cosa sono gli AI Reports?",
      "faq_a1": "Gli AI Reports sono analisi generate automaticamente basate sulle tue sessioni di caption e traduzione. Ogni report esamina aspetti diversi: grammatica, vocabolario, fluidità, interferenze dalla lingua madre, e altro ancora. I report usano solo i dati delle tue sessioni reali — non inventano nulla.",
      "faq_q2": "Quanto sono affidabili?",
      "faq_a2": "L'affidabilità dipende dal numero di sessioni analizzate. Più sessioni = più dati = analisi più solide. Ogni report include una nota sull'affidabilità. I report non assegnano certificazioni ufficiali CEFR e usano un linguaggio prudente.",
      "faq_q3": "Perché alcuni report sono bloccati?",
      "faq_a3": "Alcuni report richiedono un numero minimo di sessioni per essere affidabili. Ad esempio, il report \"Errori Ricorrenti\" ha bisogno di almeno 3 sessioni per distinguere un errore occasionale da un pattern.",
      "faq_q4": "I crediti si consumano se il report fallisce?",
      "faq_a4": "No. I crediti vengono scalati solo quando il report viene completato con successo. Se un report va in errore, puoi riprovarlo senza costi aggiuntivi.",
      "faq_q5": "Posso scaricare i report?",
      "faq_a5": "Sì. Ogni report può essere scaricato come file di testo. I report includono il punteggio, la data, e il testo completo dell'analisi.",
      "faq_q6": "Il mio profilo influenza i report?",
      "faq_a6": "Sì. Obiettivi, settore, preferenze di feedback e lingua madre aiutano l'AI a produrre consigli più pertinenti. Più il profilo è completo, più i report rispecchiano il tuo contesto reale.",
      "faq_q7": "I miei dati sono al sicuro?",
      "faq_a7": "Sì. Le tue sessioni e i tuoi report sono visibili solo a te. I dati vengono usati esclusivamente per generare i tuoi report personali e non vengono condivisi con terze parti.",
      "faq_q8": "Il report sostituisce un insegnante?",
      "faq_a8": "No. È uno strumento di analisi e orientamento: trasforma dati reali in feedback utile. Non valuta la tua pronuncia, non interagisce con te, e non sostituisce il giudizio di un professionista.",

      // ── Dynamic ──
      "sessions_completed": "sessioni",
      "hours_total": "ore",
      "this_week": "questa settimana",
      "in": "in",
    },

    en: {
      // ── Topbar ──
      "start_session": "Start Session",
      "start": "Start",
      "dark": "Dark",
      "light": "Light",
      "no_notifications": "No recent notifications",
      "minutes": "Minutes",
      "credits_report": "Report credits",
      "buy_credits": "Buy credits",
      "settings": "Settings",
      "help": "Help",
      "logout": "Sign out",
      "saved_sessions": "Saved sessions",
      "saved_reports": "Saved reports",
      "home": "Home",
      "panoramica": "Dashboard",
      "language": "Language",

      // ── Sidebar ──
      "study_language": "Study language",
      "insights": "Insights",
      "word_banks": "Word banks",
      "vocabolario": "Vocabulary",
      "grammatica": "Grammar",
      "trascrizioni": "Transcripts",
      "report_ai": "AI Reports",
      "invita": "Invite",
      "profilo": "Profile",
      "aiuto": "Help",
      "trial_ends": "Trial ends in",
      "days": "days",
      "upgrade_pro": "Upgrade to Pro",
      "pro": "Pro",

      // ── Panoramica ──
      "welcome_back": "Welcome back,",
      "login_to_see_stats": "Sign in to see your statistics.",
      "your_stats_ready": "Your learning statistics are ready.",
      "start_session_btn": "Start session",
      "total_sessions": "Total sessions",
      "spoken_time": "Spoken time",
      "unique_words": "Unique words",
      "avg_wpm": "Avg WPM",
      "lexical_diversity": "Lexical diversity",
      "ai_reports_generated": "AI reports generated",
      "generate_report": "Generate report →",
      "daily_minutes": "Daily minutes",
      "completion": "Completion",
      "monthly_goal": "monthly goal",
      "last_30d": "last 30 days",
      "cefr_distribution": "CEFR Distribution",
      "loading": "Loading...",
      "complete_sessions_cefr": "Complete some sessions to see your CEFR vocabulary distribution.",
      "total_vocabulary": "Total vocabulary",
      "words": "words",
      "click_to_edit": "click to edit",

      // ── Insights ──
      "objectives": "Objectives",
      "tasks": "Tasks",
      "milestones": "Milestones",
      "estimated_level": "Estimated level",
      "short_term_objective": "Short-term objective",
      "habits": "Habits",
      "no_sessions_insights": "No sessions recorded. Start speaking!",
      "based_on_sessions": "Based on",
      "sessions_registered": "registered sessions.",
      "based_on_words": "Based on",
      "words_in_vocab": "words in your vocabulary.",
      "dominant_level": "Dominant level:",
      "define_objective": "Define an objective in your Linguistic Profile to track progress.",
      "active_tasks": "Active tasks",
      "add_task": "Add",
      "recently_completed": "Recently completed",
      "achieved_milestones": "Achieved milestones",
      "in_progress": "In progress",
      "no_milestones": "No milestones yet. Keep speaking!",
      "all_achieved": "All milestones achieved! 🎉",
      "new_task": "New task...",
      "no_tasks": "No tasks. Add one!",
      "doing": "In progress",
      "todo": "To do",
      "done": "Completed",
      "preferred_time": "Preferred time",
      "most_active_day": "Most active day",
      "of_sessions": "of sessions",
      "daily_average": "Daily average",
      "delete_task": "Delete task",

      // ── Grammatica ──
      "grammar_panoramica": "Overview",
      "verb_tenses": "Verb Tenses",
      "pronouns": "Pronouns",
      "errors": "Errors",
      "nouns": "Nouns",
      "verbs": "Verbs",
      "adjectives": "Adjectives",
      "negations": "Negations",
      "complexity": "Sentence complexity",
      "grammar_coming_soon": "Grammar data will be available after your sessions are analyzed.",
      "no_transcripts_grammar": "No transcripts available. Complete an English caption session.",
      "grammar_en_only": "Grammar is only available for English sessions.",
      "nlp_loading": "NLP library loading...",
      "analysis_based_on": "Analysis based on",
      "and": "and",
      "total_words_analysis": "total words.",
      "avg_sentence_length": "Average length:",
      "words_per_sentence": "words per sentence.",
      "questions_asked": "You asked",
      "questions": "questions",
      "good_complexity": "Good complexity! To reach C1, aim for 12+ words per sentence.",
      "improve_complexity": "To improve, try building more complex sentences with clauses and connectors.",
      "present": "Present",
      "past": "Past",
      "future": "Future (will)",
      "perfect": "Present Perfect",
      "conditional": "Conditional",
      "passive": "Passive",
      "gerund": "Gerund",
      "top_pronouns": "Top pronouns used",
      "distribution": "Distribution",
      "subject": "subject",
      "object": "object",
      "possessive": "possessives",
      "error_patterns": "Error patterns detected",
      "no_errors": "No common errors detected in your transcripts. Keep it up! 🎉",
      "occurrences": "occurrences",

      // ── Vocabolario ──
      "vocab_panoramica": "Overview",
      "cefr": "CEFR",
      "vocab_words": "Words",
      "media_usage": "Avg usage",
      "ngsl_coverage": "NGSL Coverage",
      "common_words": "common words",
      "per_word": "per word",
      "status_current": "Current status",
      "next_steps": "Next steps",
      "expand_b2": "Expand B2 vocabulary",
      "technical_words": "Technical words",
      "read_articles": "Read 3 articles/week",
      "cefr_distribution_title": "Level distribution",
      "your_vocab_count": "Your vocabulary has",
      "unique_words_count": "unique words",
      "every_session_enriches": "Every session enriches your vocabulary.",
      "search_word": "Search word...",
      "all": "All",
      "type": "Type",
      "uses": "Uses",
      "last_used": "Last used",

      // ── Word Banks ──
      "no_banks": "No word banks",
      "create_first_bank": "Create your first word bank to organize the vocabulary you want to learn.",
      "new_bank": "New bank",
      "add_word": "Add word...",
      "add": "Add",
      "expand": "expand",

      // ── Trascrizioni ──
      "select_all": "Select all",
      "delete_selected": "Delete selected",
      "favorites": "Favorites",
      "info": "Information",
      "session": "Session",
      "words_count": "Words",
      "date": "Date",
      "quality": "Quality",
      "no_sessions": "No sessions recorded",
      "rename_info": "You can rename any session by clicking the menu",
      "pdf_info": "To save a transcript as PDF, open the menu and choose Download PDF.",
      "analysis_info": "For in-depth grammar, vocabulary and fluency analysis, go to the",

      // ── Report AI ──
      "create_report": "Create Report",
      "my_reports": "My Reports",
      "ai_settings": "Settings",
      "quick_snapshot": "Quick snapshot",
      "snapshot_desc": "Instant analysis of your last session. Free once per day.",
      "generate_snapshot": "Generate Snapshot",
      "full_report": "Full report",
      "full_report_desc": "In-depth analysis of grammar, vocabulary, fluency and interference. Uses 1 credit.",
      "generate_report_btn": "Generate Report · 1 credit",
      "credits_available": "credits available. Only charged on completion.",
      "ai_preferences": "AI Preferences",
      "focus": "Focus",
      "feedback_tone": "Feedback tone",
      "register": "Register",
      "credits": "Credits",

      // ── Profilo ──
      "general": "General",
      "linguistic_profile": "Linguistic Profile",
      "preferences": "Preferences",
      "member_since": "Member since",
      "plan": "Plan",
      "native_language": "Native language",
      "interface_language": "Interface language",
      "activity": "Activity",
      "hours_spoken": "Hours spoken",
      "consecutive_days": "Consecutive days",
      "why_study": "Why are you studying this language?",
      "use_situations": "In what situations do you use it?",
      "multi_select": "select multiple",
      "your_sector": "What is your field?",
      "your_level": "How do you rate your current level?",
      "short_term_goal": "Short-term goal",
      "save_profile": "Save profile",
      "saved": "Saved",
      "go_to_linguistic_profile": "Go to Linguistic Profile",
      "profile_help_text": "Answer the Linguistic Profile questions to help AI Reports be more precise. The more complete your profile, the more the advice will reflect your real context: field, objectives and level.",
      "language_settings": "Language",
      "appearance": "Appearance",
      "theme": "Theme",
      "font_preference": "Font preference",
      "notifications": "Notifications",
      "ai_report_ready": "AI Report ready",
      "goals_reached": "Goals reached",
      "newsletter": "Newsletter",
      "active": "Active",
      "disabled": "Disabled",
      "save_preferences": "Save preferences",
      "account": "Account",
      "name": "Name",
      "email": "Email",
      "privacy": "Privacy",
      "session_data": "Session data",

      // ── Invita ──
      "invite_link": "Link",
      "invite_credits": "Credits",
      "share_link": "Share the link",
      "referral_code": "Referral code",
      "invite_status": "Invite status",
      "invited": "Invited",
      "active_invites": "Active",
      "earned": "Earned",
      "copy": "Copy",

      // ── Impostazioni ──
      "save_settings": "Save settings",
      "website_language": "Website language",
      "anonymous_sharing_label": "Anonymous sharing",
      "saved_check": "✓ Saved",
      "privacy_sessions_info": "When enabled, your sessions (transcripts, words, metrics) are saved to Supabase and appear in the Sessions tab. Disable if you prefer not to keep history.",
      "privacy_anon_info": "When enabled, anonymous data about your sessions (never the transcript content) may be used to improve analysis models. No personal data is ever shared.",
      "your_name": "Your name",

      // ── Start Session ──
      "caption": "Caption",
      "translate": "Translate",
      "caption_desc": "Subtitles in a single language",
      "caption_sub": "Choose a language and start real-time subtitles.",
      "translate_desc": "Real-time translation",
      "translate_sub": "Choose your spoken language and subtitle language.",
      "start_caption": "Start Caption",
      "start_translate": "Start Translation",
      "choose_language": "Choose language",
      "confirm": "Confirm",
      "spoken": "spoken",
      "subtitles": "subtitles",
      "click_to_change": "click to change",
      "i_speak": "I speak in…",

      // ── AI Reports settings ──
      "precision_vocab": "Precision, Vocabulary",
      "grammar_errors_opt": "Grammar, Errors",
      "fluency_pronunciation": "Fluency, Pronunciation",
      "comprehension_interference": "Comprehension, Interference",
      "complete_all": "Complete (all aspects)",
      "encouraging": "Encouraging",
      "direct": "Direct",
      "analytical": "Analytical",
      "balanced": "Balanced",
      "professional": "Professional",
      "informal": "Informal",
      "academic": "Academic",
      "technical": "Technical",
      "standard": "Standard",
      "standard_plan": "Standard",
      "free": "Free",
      "free_plan": "Free",

      // ── Profilo Linguistico chips ──
      "work": "Work",
      "study": "Study",
      "travel": "Travel",
      "conversation": "Conversation",
      "exams": "Exams",
      "relocation": "Relocation",
      "film_content": "Films & content",
      "meetings": "Meetings",
      "emails": "Emails",
      "presentations": "Presentations",
      "phone_calls": "Phone calls",
      "social": "Social",
      "reading": "Reading",
      "engineering": "Engineering",
      "business": "Business",
      "design": "Design",
      "marketing": "Marketing",
      "healthcare": "Healthcare",
      "education": "Education",
      "technology": "Technology",
      "a1_beginner": "A1 · Beginner",
      "a2_elementary": "A2 · Elementary",
      "b1_intermediate": "B1 · Intermediate",
      "b2_advanced": "B2 · Advanced",
      "c1_fluent": "C1 · Fluent",
      "c2_mastery": "C2 · Mastery",

      // ── FAQ ──
      "faq_subtitle": "Frequently asked questions about the report system, credits, and analysis reliability.",
      "faq_q1": "What are AI Reports?",
      "faq_a1": "AI Reports are automatically generated analyses based on your caption and translation sessions. Each report examines different aspects: grammar, vocabulary, fluency, native language interference, and more. Reports use only your real session data — they don't invent anything.",
      "faq_q2": "How reliable are they?",
      "faq_a2": "Reliability depends on the number of sessions analyzed. More sessions = more data = more solid analysis. Each report includes a reliability note. Reports do not assign official CEFR certifications and use cautious language.",
      "faq_q3": "Why are some reports locked?",
      "faq_a3": "Some reports require a minimum number of sessions to be reliable. For example, the \"Recurring Errors\" report needs at least 3 sessions to distinguish an occasional mistake from a pattern.",
      "faq_q4": "Are credits consumed if the report fails?",
      "faq_a4": "No. Credits are only deducted when the report is completed successfully. If a report errors out, you can retry it at no extra cost.",
      "faq_q5": "Can I download reports?",
      "faq_a5": "Yes. Each report can be downloaded as a text file. Reports include the score, date, and full analysis text.",
      "faq_q6": "Does my profile influence the reports?",
      "faq_a6": "Yes. Goals, sector, feedback preferences, and native language help the AI produce more relevant advice. The more complete your profile, the more reports reflect your real context.",
      "faq_q7": "Is my data safe?",
      "faq_a7": "Yes. Your sessions and reports are visible only to you. Data is used exclusively to generate your personal reports and is never shared with third parties.",
      "faq_q8": "Does the report replace a teacher?",
      "faq_a8": "No. It's an analysis and guidance tool: it turns real data into useful feedback. It doesn't evaluate your pronunciation, doesn't interact with you, and doesn't replace professional judgment.",

      // ── Dynamic ──
      "sessions_completed": "sessions",
      "hours_total": "hours",
      "this_week": "this week",
      "in": "in",
    }
  };

  var _lang = 'it';
  var _loaded = false;

  function detectLang() {
    // 1. Check localStorage
    var stored = localStorage.getItem('sottotitoli-lang');
    if (stored === 'en' || stored === 'it') return stored;
    // 2. Browser preference
    var browser = (navigator.language || 'it').split('-')[0];
    if (browser === 'en') return 'en';
    return 'it';
  }

  function t(key) {
    var dict = DICT[_lang] || DICT.it;
    return dict[key] || key;
  }

  function apply(root) {
    root = root || document;
    // data-i18n attributes on elements
    root.querySelectorAll('[data-i18n]').forEach(function(el){
      var key = el.getAttribute('data-i18n');
      if (!key) return;
      var itText = DICT.it[key] || key;
      var enText = DICT.en[key] || key;
      if (el.textContent.trim() === itText || el.textContent.trim() === enText) {
        el.textContent = t(key);
      }
    });
    // data-i18n-placeholder
    root.querySelectorAll('[data-i18n-placeholder]').forEach(function(el){
      var key = el.getAttribute('data-i18n-placeholder');
      if (key) el.placeholder = t(key);
    });
    // data-i18n-title
    root.querySelectorAll('[data-i18n-title]').forEach(function(el){
      var key = el.getAttribute('data-i18n-title');
      if (key) el.title = t(key);
    });
    // Translate select options
    root.querySelectorAll('option[data-i18n]').forEach(function(el){
      var key = el.getAttribute('data-i18n');
      if (key) el.textContent = t(key);
    });
    // Walk text nodes and translate known Italian strings
    if (_lang === 'en') {
      var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
      var textNodes = [];
      while(walker.nextNode()) textNodes.push(walker.currentNode);
      textNodes.forEach(function(tn){
        var text = tn.textContent.trim();
        if (!text || text.length < 2) return;
        // Check if this matches any Italian key (reverse lookup)
        for (var k in DICT.it) {
          if (DICT.it[k] === text && DICT.en[k] && DICT.en[k] !== text) {
            tn.textContent = tn.textContent.replace(text, DICT.en[k]);
            break;
          }
        }
      });
    }
  }

  function setLang(lang) {
    if (lang !== 'en' && lang !== 'it') lang = detectLang();
    _lang = lang;
    localStorage.setItem('sottotitoli-lang', lang);
    document.documentElement.setAttribute('lang', lang);
    // Save to Supabase if available
    try {
      var sb = window.sottotitoliSupabase;
      if (sb) {
        sb.auth.getSession().then(function(r){
          var uid = r.data?.session?.user?.id;
          if (uid) {
            sb.from('user_preferences').upsert({ user_id: uid, ui_language: lang }, { onConflict: 'user_id' }).then(function(){});
          }
        });
      }
    } catch(e) {}
    apply();
    // Dispatch event for page-specific handlers
    window.dispatchEvent(new CustomEvent('i18n-changed', { detail: { lang: lang } }));
    updateToggleBtns();
    return lang;
  }

  async function init() {
    if (_loaded) return _lang;
    _loaded = true;
    var lang = detectLang();

    // Inject toggle immediately — don't wait for Supabase
    injectLangToggle();

    // Try Supabase for saved language preference
    try {
      var sb = window.sottotitoliSupabase;
      if (sb) {
        var r = await sb.auth.getSession();
        var uid = r.data?.session?.user?.id;
        if (uid) {
          try {
            var pref = await sb.from('user_preferences').select('ui_language').eq('user_id', uid).maybeSingle();
            if (pref.data?.ui_language === 'en' || pref.data?.ui_language === 'it') {
              lang = pref.data.ui_language;
            }
          } catch(e) {}
        }
      }
    } catch(e) {}
    return setLang(lang);
  }

  function injectLangToggle() {
    // Find any user dropdown and inject language toggle
    var targets = document.querySelectorAll('#userDropdown, .user-dropdown, [data-dropdown="user"]');
    targets.forEach(function(dd){
      if (dd.querySelector('.i18n-toggle, [onclick*="I18n.setLang"]')) return; // already has toggle
      var div = document.createElement('div');
      div.className = 'i18n-toggle';
      div.style.cssText = 'padding:10px 14px;display:flex;align-items:center;justify-content:space-between;font-size:13px;border-top:1px solid var(--line, #e2e5ea)';
      div.innerHTML = '<span>'+t('language')+'</span><span>'+
        '<button onclick="I18n.setLang(\'it\')" style="border:none;background:none;cursor:pointer;font-weight:600;font-size:13px;font-family:inherit;padding:2px 6px;color:'+(_lang==='it'?'var(--teal, #059669)':'var(--text-faint, #9ca3af)')+'" class="i18n-btn-it">IT</button> '+
        '<span style="color:var(--text-faint, #9ca3af)">|</span> '+
        '<button onclick="I18n.setLang(\'en\')" style="border:none;background:none;cursor:pointer;font-weight:600;font-size:13px;font-family:inherit;padding:2px 6px;color:'+(_lang==='en'?'var(--teal, #059669)':'var(--text-faint, #9ca3af)')+'" class="i18n-btn-en">EN</button>'+
        '</span>';
      // Insert before logout/exit button or at end
      var exitBtn = dd.querySelector('[onclick*="signOut"], .ud-link.danger, button:last-of-type');
      if (exitBtn && exitBtn.parentElement === dd) {
        dd.insertBefore(div, exitBtn.closest('button, a, .dropdown-item'));
      } else {
        dd.appendChild(div);
      }
    });
    // Update toggle highlight
    updateToggleBtns();
  }

  function updateToggleBtns() {
    document.querySelectorAll('.i18n-btn-it').forEach(function(b){ b.style.color = _lang==='it' ? 'var(--teal, #059669)' : 'var(--text-faint, #9ca3af)'; });
    document.querySelectorAll('.i18n-btn-en').forEach(function(b){ b.style.color = _lang==='en' ? 'var(--teal, #059669)' : 'var(--text-faint, #9ca3af)'; });
  }

  window.I18n = {
    init: init,
    setLang: setLang,
    t: t,
    apply: apply,
    getLang: function(){ return _lang; },
    DICT: DICT
  };

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ init(); });
  } else {
    init();
  }

  // ── MutationObserver: auto-translate dynamically added content ──
  var _observer = new MutationObserver(function(mutations){
    mutations.forEach(function(m){
      m.addedNodes.forEach(function(node){
        if (node.nodeType === 1) {
          apply(node);
          if (node.querySelector && (node.querySelector('#userDropdown') || node.classList.contains('user-dropdown'))) {
            injectLangToggle();
          }
        }
      });
    });
  });
  _observer.observe(document.body || document.documentElement, { childList: true, subtree: true });

})();