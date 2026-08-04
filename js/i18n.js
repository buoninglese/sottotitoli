/* ═══ Sottotitoli i18n — Italian/English translations ═══
 *
 * Architecture (v2, guardless):
 *   - Italian is the HTML source-of-truth. Every visible string MUST have
 *     a data-i18n="key" attribute on its containing element.
 *   - At init(), captureOriginals() snapshots Italian text into
 *     data-i18n-orig-txt / data-i18n-orig-html attributes.
 *   - apply() restores originals when switching to IT, translates when
 *     switching to EN. No fragile textContent===dictValue guard.
 *   - characterData MutationObserver auto-translates JS-injected content.
 *   - Dynamic content convention: JS MUST inject ITALIAN text into the DOM.
 *     If JS injects English text and the user switches to IT, the English
 *     text is captured as the "original" — a silent corruption.
 *
 * Migration:
 *   - Run I18n.annotate(document.body) in DevTools on each page to discover
 *     untagged text. Add the suggested data-i18n attributes to your HTML,
 *     then remove the annotate() helper.
 * ═══════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  var DICT = {
    it: {
      // ── Topbar ──
      "start_session": "Avvia sessione",
      "start": "Start",
      "theme_dark": "Scuro",
      "theme_light": "Chiaro",
      "theme_auto": "Automatico",
      "notifications_empty": "Nessuna notifica recente",
      "minutes": "Minuti",
      "credits_report": "Crediti report",
      "buy_credits": "Aggiungi minuti/crediti",
      "settings": "Impostazioni",
      "help": "Aiuto",
      "logout": "Esci",
      "saved_sessions": "Sessioni salvate",
      "saved_reports": "Report salvati",
      "home": "Home",
      "panoramica": "Panoramica",
      "language": "Lingua",
      "back_to_dash": "Indietro",

      // ── Sidebar ──
      "mode_view": "Vista",
      "mode_edit": "Modifica",
      "mode_save": "Salva parole",
      "mode_bookmark": "Salva righe",
      "mode_pos": "View POS",
      "slide_style": "Stile",
      "slide_captions": "Caption",
      "slide_vocab": "Lessico",
      "slide_words": "Parole",
      "slide_grammar": "Gramm.",
      "listen": "Ascolta",
      "pause": "Pausa",
      "stop": "Stop",
      "mic_off": "Mic Off",
      "mic_on": "Mic On",
      "study_language": "Lingua studio",
      "insights": "Approfondimenti",
      "vb_guide": "<strong>Stile</strong> cambia la palette colore delle card. <strong>Modo</strong> colora l'intestazione per parte del discorso (POS) o livello CEFR. Le parole aggiunte con <strong>+</strong> vengono salvate nella tua banca <em>Build From Known</em>.",
      "vb_style": "Stile",
      "vb_style_desc": "Schema colore delle card",
      "vb_color": "Colore",
      "vb_mode": "Modo",
      "vb_mode_desc": "Colora per tipo di parola o livello",
      "vb_default": "Default",
      "vb_pos_accent": "POS Accent",
      "vb_cefr_accent": "CEFR Accent",
      "vb_synonyms": "Sinonimi",
      "vb_antonyms": "Contrari",
      "vb_word_family": "Famiglia di parole",
      "vb_collocations": "Collocazioni",
      "vb_next_level": "Livello superiore",
      "vb_search_placeholder": "Cerca una parola che conosci…",
      "vb_empty_title": "Costruisci da ciò che sai",
      "vb_empty_desc": "Scrivi una parola che conosci e Sottotitoli ti mostrerà sinonimi, contrari, collocazioni e parole correlate al tuo livello. Più sessioni fai, più suggerimenti saranno precisi.",
      "vb_fullscreen": "Schermo intero",
      "vb_it_guide": "<strong>Stile</strong> cambia la palette colore delle card. <strong>Modo</strong> colora l'intestazione per parte del discorso (POS) o livello CEFR. Le parole aggiunte con <strong>+</strong> vengono salvate nella tua banca <em>Italian Builder</em>.",
      "vb_it_search_placeholder": "Cerca una parola italiana…",
      "vb_it_search_btn": "Cerca",
      "vb_it_empty_title": "Vocabolario Italiano",
      "vb_it_empty_desc": "Cerca una parola italiana e Sottotitoli ti mostrerà la definizione, la traduzione in inglese e parole correlate. Più sessioni fai, più suggerimenti saranno precisi.",
      "wb_review_title": "Parole da ripassare",
      "wb_review_refresh": "Refresh",
      "wb_review_mark_all": "Segna tutte come ripassate",
      "wb_review_bulk_done": "Fatto",
      "wb_review_col_word": "Parola",
      "wb_review_col_cefr": "CEFR",
      "wb_review_col_pos": "POS",
      "wb_review_col_last": "Ultimo ripasso",
      "wb_review_col_interval": "Intervallo SRS",
      "wb_review_col_status": "Stato",
      "wb_review_empty_title": "Tutto in ordine!",
      "wb_review_empty_desc": "Nessuna parola da ripassare oggi. Torna domani o inizia una nuova sessione per aggiungere parole.",
      "wb_search_placeholder": "Cerca banche o parole…",
      "wb_filter_all": "All",
      "wb_filter_pinned": "Pinned",
      "wb_filter_smart": "Smart",
      "wb_filter_yours": "Yours",
      "wb_pinned": "Pinned",
      "wb_pinned_sub": "Always available",
      "wb_smart": "Smart",
      "wb_smart_sub": "Suggested by Sottotitoli",
      "wb_yours": "Yours",
      "wb_yours_sub": "Your collections",
      "wb_it_pinned": "Pinned",
      "wb_it_pinned_sub": "Sempre disponibile",
      "wb_it_smart": "Smart",
      "wb_it_smart_sub": "Suggerito da Sottotitoli",
      "wb_it_yours": "Proprie",
      "wb_it_yours_sub": "Le tue collezioni",
      "wb_it_search_placeholder": "Cerca banche o parole italiane…",
      "wb_it_filter_all": "Tutte",
      "wb_it_filter_pinned": "Pinned",
      "wb_it_filter_smart": "Smart",
      "wb_it_filter_custom": "Proprie",
      "vt_dashboard": "Dashboard",
      "vt_tasks": "Compiti",
      "vt_review": "Ripasso",
      "gram_my_reports": "I miei Report",
      "gram_generate": "Genera Report",
      "gram_my_errors": "I miei Errori",
      "insights_hero": "Completa il tuo <strong>Profilo</strong> e l'<strong>Onboarding</strong> per aiutare i Report AI a essere più precisi. Più il tuo profilo è completo, più i consigli rispecchieranno il tuo contesto reale.",
      "insights_go_profile": "Vai al Profilo",
      "insights_overview": "Overview",
      "insights_objectives": "Obiettivi",
      "insights_percorso": "Percorso",
      "insights_panoramica": "Panoramica",
      "insights_affidabilita": "Affidabilità",
      "insights_habits": "Abitudini",
      "insights_next_step": "Prossimo passo",
      "insights_focus_areas": "Aree di miglioramento",
      "insights_directional": "Sono indicazioni direzionali, non valutazioni definitive.",
      "insights_complete_onboarding": "Completa l'onboarding per vedere le tue aree di miglioramento.",
      "insights_goal_short": "Obiettivo a breve termine",
      "insights_goal_long": "Obiettivo a lungo termine",
      "insights_generated_from": "Generato dall'onboarding — obiettivi ottimizzati e suggerimenti personalizzati.",
      "insights_read_full": "Leggi il report completo →",
      "insights_traguardi_title": "Traguardi",
      "insights_traguardi_sub": "Ogni traguardo raggiunto è una pietra miliare nel tuo percorso. Continua a fare pratica per sbloccarli tutti.",
      "insights_journey_start": "Il tuo percorso inizia qui. Completa la tua prima sessione per sbloccare il primo traguardo e vedere la tua timeline crescere.",
      "insights_sessions": "Sessioni",
      "insights_minutes_spoken": "Minuti parlati",
      "insights_unique_words": "Parole uniche",
      "insights_streak_days": "Giorni di fila",
      "insights_daily_avg": "Media giornaliera",
      "insights_pref_time": "Fascia preferita",
      "insights_active_days": "Giorni più attivi",
      "insights_no_data": "Non ci sono ancora abbastanza dati per tracciare un profilo significativo.",
      "insights_low_confidence": "Affidabilità bassa — nessuna sessione completata.",
      "insights_start_sessions": "Inizia con qualche sessione breve in giorni diversi per permettere al sistema di rilevare i primi pattern.",
      "insights_loading": "Caricamento…",
      "insights_your_ai_profile": "Il tuo profilo AI",
      "word_banks": "Banche parole",
      "vocabolario": "Vocabolario",
      "grammatica": "Grammatica",
      "trascrizioni": "Trascrizioni",
      "tr_subtitle": "Sessioni salvate. Le trascrizioni vengono conservate per 30 giorni, poi eliminate automaticamente.",
      "tr_saved_sessions": "Sessioni salvate",
      "tr_total_minutes": "Minuti totali",
      "tr_last_session": "Ultima sessione",
      "tr_filter_all": "Tutte",
      "tr_filter_favorites": "Preferiti",
      "tr_filter_7days": "Ultimi 7 giorni",
      "tr_filter_en": "Solo inglese",
      "tr_filter_it": "Solo italiano",
      "tr_filter_translated": "Con traduzione",
      "tr_view": "Vista:",
      "tr_view_table": "Tabella",
      "tr_view_drawer": "Drawer",
      "tr_bulk_none": "0 selezionate",
      "tr_bulk_delete": "Elimina selezionate",
      "tr_policy": "Policy: eliminazione automatica dopo 30 giorni",
      "tr_col_session": "Sessione",
      "tr_col_date": "Data",
      "tr_col_duration": "Durata",
      "tr_col_language": "Lingua",
      "tr_col_status": "Stato",
      "tr_empty": "Nessuna sessione trovata. Inizia una sessione di caption o traduzione.",
      "tr_empty_short": "Nessuna sessione trovata. Inizia una sessione.",
      "tr_session_prefix": "Sessione",
      "tr_expires_in": "Scade tra",
      "tr_days_left": "giorni rimanenti",
      "translations": "Traduzioni",
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
      "hero_no_data": "Completa alcune sessioni per trasformare il tuo modo di parlare in feedback utile su fluidità, vocabolario e progressi.",
      "hero_early_data": "Iniziamo a vedere i primi pattern, ma con un po' più di tempo di parola il tuo feedback diventerà molto più preciso e personale.",
      "hero_growing_data": "I tuoi dati rivelano già tendenze utili. Apri Insights per vedere cosa sta migliorando e cosa merita più attenzione.",
      "hero_established_data": "Abbiamo identificato pattern significativi tra le tue sessioni. Apri Insights per un'analisi più approfondita su punti di forza, abitudini e prossimi passi.",
      "hero_keep_talking": "Continua a parlare",
      "hero_open_insights": "Apri Insights",
      "hero_learn_more": "Scopri di più",
      "total_sessions": "Sessioni totali",
      "spoken_time": "Tempo parlato",
      "unique_words": "Parole uniche",
      "avg_wpm": "WPM medio",
      "session_minutes_last_14_days": "Minuti di sessione — ultimi 14 giorni",
      "estimated_language_profile": "Profilo linguistico stimato",

      // Wordbanks
      "word_definition_unavailable": "Definizione non ancora disponibile.",
      "word_not_in_any_bank": "Non presente in nessuna word bank.",
      "wordbank_no_words": "Nessuna parola ancora. Inizia una sessione o aggiungi parole.",
      "wordbank_status_new": "Nuova",
      "wordbank_status_learning": "In apprendimento",
      "wordbank_status_known": "Conosciuta",
      "wordbank_status_ignored": "Ignorata",
      "wordbank_drawer_word_details": "Dettagli parola",
      "wordbank_drawer_first_seen": "Vista la prima volta",
      "wordbank_drawer_unknown": "Sconosciuto",
      "wordbank_col_familiarity": "Familiarità",
      "wordbank_col_lemma": "Lemma",
      "wordbank_col_pos": "POS",
      "wordbank_col_cefr": "CEFR",
      "wordbank_col_first_seen": "Prima volta",
      "wordbank_col_last_seen": "Ultima volta",
      "wordbank_col_count": "Conteggio",
      "wordbank_col_actions": "Azioni",

      // Review Due
      "review_due_words": "Parole da ripassare",
      "review_due_mark_all": "Segna tutte come ripassate",
      "review_due_all_clear": "Tutto in ordine!",
      "review_due_empty_desc": "Nessuna parola da ripassare oggi. Torna domani o inizia una nuova sessione per aggiungere parole.",
      "review_due_selected": "selezionate",
      "review_due_done": "Fatto",
      "review_due_overdue": "Scadute",
      "review_due_due_today": "In programma oggi",
      "review_due_reviewed_today": "Ripassate oggi",
      "review_due_mastered": "Padroneggiate",
      "review_due_mark_done": "Segna come ripassata",
      "review_due_never": "Mai",

      // Build From What You Know
      "bfwk_title": "Costruisci da ciò che sai",
      "bfwk_desc": "Scrivi una parola che conosci e Sottotitoli ti mostrerà sinonimi, contrari, collocazioni e parole correlate al tuo livello.",
      "bfwk_start_from_known": "Inizia da una parola che conosci",
      "bfwk_no_known_words": "Nessuna parola conosciuta ancora. Inizia una sessione e salva parole!",
      "bfwk_no_suggestions": "Nessun suggerimento",
      "bfwk_no_suggestions_desc": "Prova con un'altra parola o un'altra relazione.",
      "bfwk_save_word": "Salva",
      "bfwk_search_placeholder": "Scrivi una parola che conosci…",
      "bfwk_relation_synonyms": "Sinonimi",
      "bfwk_relation_antonyms": "Contrari",
      "bfwk_relation_word_family": "Famiglia di parole",
      "bfwk_relation_collocations": "Collocazioni",
      "bfwk_relation_next_level": "Livello superiore",
      "bfwk_suggestions": "suggerimenti",
      "bfwk_at_level": "a livello",
      "bfwk_saved_to": "salvato in Build From Known",
      "bfwk_download_detail": "salva la parola per visualizzarla nel dettaglio.",
      "lexical_diversity": "Diversità lessicale",
      "buy_minutes_title": "Acquista minuti",
      "buy_minutes_desc": "Ricarica il tuo credito voce in pochi click. Pagamento sicuro con Stripe.",
      "buy_minutes_btn": "Acquista minuti",
      "ai_reports_generated": "Report AI generati",
      "generate_report": "Genera report →",
      "daily_minutes": "Minuti giornalieri",
      "completion": "Completamento",
      "monthly_goal": "obiettivo mensile",
      "last_30d": "ultimi 30gg",
      "cefr_distribution": "Distribuzione CEFR",
      "loading": "Caricamento…",
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
      "default_caption": "Default caption",
      "default_caption_lang": "Lingua caption",
      "default_translation_pair": "Traduzione predefinita",
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
      "website_language": "Lingua e captions",
      "website_language_short": "Lingua sito",
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

      // ── Purchase ──
      "purchase_secure": "Acquisto Sicuro",
      "purchase_title": "Aggiungi minuti e crediti",
      "purchase_tls": "Crittografia TLS",
      "purchase_pci": "PCI-DSS Level 1",
      "purchase_nostore": "Dati carta mai salvati",
      "purchase_stripe": "Pagamento Stripe",
      "purchase_starter": "Starter",
      "purchase_standard": "Standard",
      "purchase_premium": "Premium",
      "purchase_credits_only": "Solo Crediti",
      "purchase_popular": "Più scelto",
      "purchase_starter_desc": "60 minuti totali",
      "purchase_standard_desc": "300 minuti totali",
      "purchase_premium_desc": "900 minuti totali",
      "purchase_credits_desc": "100 crediti Report AI",
      "purchase_feat_5credits": "+5 crediti Report AI",
      "purchase_feat_20credits": "+20 crediti Report AI",
      "purchase_feat_60credits": "+60 crediti Report AI",
      "purchase_feat_unlock": "Report AI sbloccato",
      "purchase_feat_support": "Supporto prioritario",

      "purchase_howto": "Come funziona",
      "purchase_howto_text": "Scegli uno dei quattro pacchetti qui sopra. I minuti sono utilizzabili per caption e traduzione. I crediti AI servono per generare Report AI dopo le sessioni. I minuti e i crediti non scadono mai.",
      "purchase_product": "Prodotto",
      "purchase_includes": "Include",
      "purchase_pay_btn": "Vai al pagamento →",
      "purchase_terms": "Termini e Condizioni",
      "purchase_terms_text": "I minuti acquistati sono utilizzabili per caption e traduzione in tempo reale. I crediti AI sono dedicati esclusivamente alla generazione di Report AI. Il pagamento è gestito da Stripe. I crediti sono associati al tuo account e non sono trasferibili.",
      "purchase_privacy": "Informativa Privacy",
      "purchase_privacy_text": "Trattiamo i tuoi dati personali nel rispetto del GDPR. Raccogliamo esclusivamente email, nome e storico acquisti. I dati di pagamento sono gestiti interamente da Stripe e non transitano sui nostri server.",
      "purchase_refunds": "Rimborsi",
      "purchase_refunds_text": "Hai diritto a 14 giorni di recesso se meno del 10% dei crediti è stato utilizzato. I crediti acquistati non scadono. In caso di problemi tecnici che impediscono l'uso del servizio, hai diritto a un rimborso proporzionale.",
      "purchase_footer": "© 2026 Sottotitoli · Fatto con cura in Puglia. Made in Italy. | ",
      "terms": "Termini",

      // ── Dynamic ──
      "sessions_completed": "sessioni",
      "hours_total": "ore",
      "this_week": "questa settimana",
      "in": "in",
      "help_desc": "Domande frequenti sul sistema di report, crediti, e sull'affidabilità delle analisi.",
      "prof_complete_onboarding": "Completa l'onboarding.",
      "prof_other_langs": "Altre lingue",
      "rai_step1": "Select Analysis Preset",
      "rai_step2": "Source Data",
      "rai_step3": "Analysis Engine",
      "settings_cap_lang": "Lingua caption",
      "settings_def_trans": "Traduzione predefinita",
      "settings_desc": "Personalizza il tuo ambiente di apprendimento e l'aspetto dell'app.",
      "settings_lang_captions": "Lingua e captions",
      "settings_site_lang": "Lingua sito",
      "sidebar_ai_voice": "AI Voice",
      "sidebar_grammar_hub": "Grammar Hub",
      "sidebar_premium": "PREMIUM",
      "sidebar_vocabulary_builder": "Vocabulary Builder",
      "ss_caption_btn": "Avvia Caption",
      "ss_caption_desc": "Scegli la lingua e avvia i sottotitoli in tempo reale.",
      "ss_caption_hint": "clicca per cambiare",
      "ss_caption_tag": "Caption",
      "ss_translate_btn": "Avvia Traduzione",
      "ss_translate_desc": "Scegli la lingua che parli e quella per i sottotitoli.",
      "ss_translate_tag": "Translate",
      "ss_solo_lingua": "Solo<br><em>Lingua</em>",
      "ss_live_relay": "Live<br><em>Relay</em>",
      "ss_choose_lang": "Scegli la lingua",
      "ss_i_speak": "Io parlo in…",
      "ss_subtitles_in": "Sottotitoli in…",
      "ss_confirm": "Conferma",
      "topbar_skip_link": "Vai al contenuto principale",
      "tr_last_7days": "Ultimi 7 giorni",
      "wb_new_bank": "Nuova Banca",
      "help_reports_answer": "Gli AI Reports sono analisi generate automaticamente basate sulle tue sessioni di caption e traduzione. Ogni report esamina aspetti diversi: grammatica, vocabolario, fluidità, interferenze dalla lingua madre, e altro ancora. I report usano solo i dati delle tue sessioni reali — non inventano nulla.",
      "help_reliable_answer": "L'affidabilità dipende dal numero di sessioni analizzate. Più sessioni = più dati = analisi più solide. Ogni report include una nota sull'affidabilità. I report non assegnano certificazioni ufficiali CEFR e usano un linguaggio prudente.",
      "help_safe_answer": "Sì. Le tue sessioni e i tuoi report sono visibili solo a te. I dati vengono usati esclusivamente per generare i tuoi report personali e non vengono condivisi con terze parti.",
      "help_teacher_answer": "No. È uno strumento di analisi e orientamento: trasforma dati reali in feedback utile. Non valuta la tua pronuncia, non interagisce con te, e non sostituisce il giudizio di un professionista.",
      "help_blocked_answer": "Alcuni report richiedono un numero minimo di sessioni per essere affidabili. Ad esempio, il report \"Errori Ricorrenti\" ha bisogno di almeno 3 sessioni per distinguere un errore occasionale da un pattern.",
      "help_credits_fail_answer": "No. I crediti vengono scalati solo quando il report viene completato con successo. Se un report va in errore, puoi riprovarlo senza costi aggiuntivi.",
      "help_download_answer": "Sì. Ogni report può essere scaricato come file di testo. I report includono il punteggio, la data, e il testo completo dell'analisi.",
      "help_profile_answer": "Sì. Obiettivi, settore, preferenze di feedback e lingua madre aiutano l'AI a produrre consigli più pertinenti. Più il profilo è completo, più i report rispecchiano il tuo contesto reale.",
      "help_reports_preview": "Analisi automatiche basate sulle tue sessioni di caption e traduzione.",
      "help_reliable_preview": "Precisione e modello statistico dei risultati.",
      "help_safe_preview": "Informazioni su privacy e crittografia dei dati.",
      "help_teacher_preview": "Come integrare il feedback AI con i metodi tradizionali.",
      "help_blocked_preview": "Livelli di accesso e requisiti di crediti.",
      "help_credits_fail_preview": "Policy su fallimenti e rimborsi.",
      "help_download_preview": "Opzioni di export disponibili.",
      "help_profile_preview": "Come la tua storia e le impostazioni guidano l'AI.",
      "gram_dashboard": "Dashboard",
      "gram_explorer": "Explorer",
      "gram_strategy": "Learning Strategy",
      "gram_desc": "Error Analysis Engine — monitora i tuoi pattern grammaticali ricorrenti e allena i punti deboli con interventi mirati.",
      "gram_timeline": "Strategic Intervention Timeline",
      "gram_auto_schedule": "Automated Schedule",
      "gram_phase_detection": "Detection",
      "gram_phase_mapping": "Pattern Mapping",
      "gram_phase_drill": "Active Drill",
      "gram_phase_validation": "Validation",
      "gram_current": "Current",
      "gram_training_queue": "Training Queue",
      "gram_training_sub": "Pattern attivi in allenamento",
      "gram_col_point": "Grammar Point",
      "gram_col_start": "Start",
      "gram_col_priority": "Priority",
      "gram_col_mastery": "Mastery",
      "gram_col_next": "Next Review",
      "gram_loading": "Caricamento…",
      "gram_no_data": "Non ci sono ancora dati grammaticali. Completa alcune sessioni.",
      "gram_diag_title": "Diagnostic Focus Areas",
      "gram_diag_analytics": "Diagnostic & Predictive Analytics",
      "gram_diag_sub": "Advanced pattern modeling & mastery forecasting",
      "gram_active_pattern": "Active Pattern:",
      "gram_training_params": "Training Parameters",
      "gram_intensity": "Training Intensity",
      "gram_cognitive": "Cognitive Interference",
      "gram_persistence": "Pattern Persistence",
      "gram_momentum": "Current Momentum",
      "gram_target": "Target Frequency",
      "gram_vs_week": "+12% vs last week",
      "gram_strategic": "Strategic Importance",
      "gram_short_obj": "Short-term Objective",
      "gram_short_desc": "Crucial for passing the B2 Speaking Diagnostic.",
      "gram_long_obj": "Long-term Objective",
      "gram_long_desc": "Essential for achieving native-level nuance in professional correspondence.",
      "gram_stability": "Projected Stability",
      "gram_based_on": "Based on current session velocity",
      "gram_path": "Path to Mastery",
      "gram_trajectory": "Current Trajectory",
      "gram_accelerated": "Accelerated (+20% focus)",
      "gram_forecast_title": "Mastery Forecast Logic",
      "gram_forecast_desc": "Increasing study frequency by +20% weekly focus shifts the stability date forward by 6 days.",
      "gram_download": "Download A4",
      "gram_practice": "Practice Now",
      "gram_explanation": "Explanation",
      "gram_formula": "Linguistic Formula",
      "gram_logic": "Step-by-Step Logic",
      "gram_step1_title": "Identify the trigger verb",
      "gram_step1_desc": "Look for verbs like pensare, credere, volere, sperare.",
      "gram_step2_title": "Check for 'che' conjunction",
      "gram_step2_desc": "Ensure there is a change of subject between the main and dependent clause.",
      "gram_step3_title": "Apply the correct tense",
      "gram_step3_desc": "Match the subjunctive tense to the timeframe of the main verb.",
      "gram_examples": "Examples Comparison",
      "gram_en_context": "English Context",
      "gram_it_corrected": "Italian Corrected Form",
      "gram_sonic_title": "Sonic Precision Strategy",
      "gram_sonic_desc": "Based on your latest 48h activity, we've identified a high-frequency collision between English relative clauses and Italian Subjunctive moods. Prioritize the \"Test\" module for Subjunctive Mood to solidify your B2 transition.",
      "gram_start_priority": "Start Priority Intervention",
      "gram_view_full": "View Full Report",
      "rai_my_reports": "I miei Report",
      "rai_impostazioni": "Impostazioni",
      "rai_step1": "Select Analysis Preset",
      "rai_step2": "Source Data",
      "rai_step3": "Analysis Engine",
      "rai_grammar": "Grammar",
      "rai_vocabulary": "Vocabulary",
      "rai_training": "Training & Focus",
      "rai_choose_transcripts": "Choose Transcripts",
      "rai_multi_select": "Multi-select specific sessions",
      "rai_choose_desc": "Choose transcripts from your history to analyze. We recommend selecting at least 3 sessions for accurate trending.",
      "rai_standard": "Standard Synthesis",
      "rai_standard_desc": "Optimized for speed and pattern detection.",
      "rai_neural": "Neural Deep Dive",
      "rai_premium_badge": "PREMIUM (+5)",
      "rai_neural_desc": "Advanced structural mapping and nuances.",
      "rai_confirm": "Confirm Configuration",
      "rai_start": "START ANALYSIS",
      "rai_recent": "Recent Generations",
      "rai_recent_sub": "AI analysis based on your recent sessions.",
      "rai_generate_new": "Generate New Report",
      "rai_col_name": "Report Name",
      "rai_col_generated": "Generated",
      "rai_col_status": "Status",
      "rai_col_actions": "Actions",
      "rai_loading_reports": "Loading reports…",
      "rai_no_reports": "No reports yet. Generate your first report.",
      "rai_total_reports": "Total Reports",
      "rai_completed": "Completed",
      "rai_avg_score": "Avg Score",
      "rai_settings_desc": "Personalizza i parametri del motore di analisi per ottimizzare la generazione dei tuoi report linguistici.",
      "rai_tone": "Tono dell'IA",
      "rai_priority": "Priorità di Correzione",
      "rai_report_lang": "Lingua dei Report",
      "rai_save_settings": "Salva Impostazioni",
      "rai_synthesis_started": "Synthesis Initialized",
      "rai_synthesis_wait": "Please wait while our linguistic neural net processes your selected transcript history.",
      "rai_abort": "Abort Analysis",
      "settings_site_lang_desc": "La lingua dell'interfaccia utente.",
      "settings_cap_lang_desc": "Lingua predefinita per i sottotitoli.",
      "settings_def_trans_desc": "Coppia di lingue predefinita per la traduzione.",
      "vb_palette": "Palette",
      "vb_color_by": "Color by",
      "vb_none": "None",
      "vb_pos": "POS",
      "vb_cefr": "CEFR",
      "vb_save_to": "Save to",
      "vb_build_from_known": "Build From Known",
      "vb_italian_tab": "🇮🇹 Italian",
      "vb_english_tab": "🇬🇧 English",
      "vb_explore_tab": "🗺️ Esplora",
      "vb_search_it_placeholder": "Cerca una parola italiana…",
      "vb_cefr_search_placeholder": "Cerca un argomento...",
      "vb_all_topics": "All topics",
      "vb_relevant_to_me": "Relevant to me",
      "vb_loading_topics": "Caricamento argomenti...",
      "vb_back": "Back",
      "vb_by_frequency": "Per frequenza",
      "vb_by_level": "Per livello",
      "vb_alpha": "Alfabetico",
      "wb_stats_total": "Totale parole",
      "wb_stats_due": "In scadenza oggi",
      "wb_stats_ok": "Tutto in ordine",
      "wb_stats_new_week": "Nuove questa settimana",
      "wb_stats_known": "Known",
      "wb_stats_learning": "Learning",
      "wb_quiz_tab": "🧠 Quiz",
      "wb_quiz_desc": "Genera un quiz personalizzato dalle tue word bank. Scegli la banca, la direzione, la modalità e quante parole includere.",
      "wb_quiz_bank": "📦 Word Bank",
      "wb_quiz_direction": "🌐 Direzione",
      "wb_quiz_mode": "🎯 Modalità",
      "wb_quiz_multiple": "Scelta multipla",
      "wb_quiz_open": "Risposta aperta",
      "wb_quiz_count": "🔢 Numero parole",
      "wb_quiz_generate": "🧠 Genera Quiz",
      "wb_quiz_back": "← Indietro",
      "wb_quiz_translate": "Traduci",
      "wb_quiz_placeholder": "Scrivi la traduzione…",
      "wb_quiz_verify": "Verifica",
      "wb_quiz_skip": "Salta →",
      "wb_quiz_finish": "🏁 Finisci",
      "wb_quiz_complete": "Quiz Completato!",
      "wb_import_title": "Import Vocabulary Bank",
      "wb_import_desc": "Upload a file — words will be extracted automatically.",
      "wb_create_title": "Create New Bank",
      "wb_create_desc": "Create an empty word bank to fill manually or import later.",
      "wb_cancel": "Cancel",
      "wb_import_btn": "Import & Create Bank",
      "wb_create_btn": "Create Bank",
      "metric_total_sessions": "Sessioni totali",
      "metric_spoken_time": "Tempo parlato",
      "metric_unique_words": "Parole uniche",
      "metric_gse_score": "Punteggio GSE",
      "metric_lexical_div": "Div. lessicale",
      "chart_session_minutes": "Minuti di sessione",
      "chart_minutes_total": "Minuti Totali",
      "hero_suggested": "Suggerito per Te",
      "hero_search_placeholder": "Cerca nel vocabolario…",
      "hero_streak": "Serie di apprendimento",
      "hero_continue": "Continua ad Apprendere",
      "hero_transcript": "Trascrizione",
      "hero_word_bank": "Banca Parole",
      "hero_new_session_title": "Avvia una nuova sessione",
      "hero_new_session_desc": "Cattura sottotitoli in tempo reale",
      "hero_new_bank_title": "Crea una nuova banca parole",
      "hero_new_bank_desc": "Raccogli e organizza il tuo vocabolario",
      "hero_words": "parole",
      "hero_terms": "termini",
      "sidebar_workspace": "Workspace",
      "sidebar_learning": "Apprendimento",
      "sidebar_reports": "Report",
      "topbar_toggle_theme": "Cambia tema",
      "topbar_notifications": "Notifiche",
      "topbar_account": "Account",
      "prof_edit_name": "Modifica nome",
      "prof_madrelingua": "Madrelingua",
      "prof_user_id": "User ID",
      "prof_profession": "Professione",
      "prof_why_study": "Perché studio",
      "prof_daily_avg": "Media giornaliera",
      "prof_pref_time": "Fascia preferita",
      "prof_active_days": "Giorni più attivi",
      "tr_all": "Tutte",
      "tr_favorites": "★ Preferiti",
      "tr_last_7days": "Ultimi 7 giorni",
      "tr_english_only": "Solo inglese",
      "tr_italian_only": "Solo italiano",
      "tr_with_translation": "Con traduzione",
      "help_system": "Sistema & Affidabilità",
      "help_what_are_reports": "Cosa sono gli AI Reports?",
      "help_how_reliable": "Quanto sono affidabili?",
      "help_data_safe": "I miei dati sono al sicuro?",
      "help_replace_teacher": "Il report sostituisce un insegnante?",
      "help_credits": "Crediti & Accesso",
      "help_why_blocked": "Perché alcuni report sono bloccati?",
      "help_credits_fail": "I crediti si consumano se il report fallisce?",
      "help_download": "Posso scaricare i report?",
      "help_profile_influence": "Il mio profilo influenza i report?",
      "help_not_found": "Non hai trovato la risposta che cercavi?",
      "help_contact": "Contatta il Supporto",
      "rai_create": "Crea Report",
    },

    en: {
      // ── Topbar ──
      "start_session": "Start Session",
      "start": "Start",
      "theme_dark": "Dark",
      "theme_light": "Light",
      "theme_auto": "Auto",
      "notifications_empty": "No recent notifications",
      "minutes": "Minutes",
      "credits_report": "Report credits",
      "buy_credits": "Add minutes/credits",
      "settings": "Settings",
      "help": "Help",
      "logout": "Sign out",
      "saved_sessions": "Saved sessions",
      "saved_reports": "Saved reports",
      "home": "Home",
      "panoramica": "Dashboard",
      "language": "Language",
      "back_to_dash": "Go back",

      // ── Sidebar ──
      "mode_view": "View",
      "mode_edit": "Edit",
      "mode_save": "Save Words",
      "mode_bookmark": "Save Lines",
      "mode_pos": "View POS",
      "slide_style": "Style",
      "slide_captions": "Captions",
      "slide_vocab": "Vocab",
      "slide_words": "Words",
      "slide_grammar": "Grammar",
      "listen": "Listen",
      "pause": "Pause",
      "stop": "Stop",
      "mic_off": "Mic Off",
      "mic_on": "Mic On",
      "study_language": "Study language",
      "insights": "Insights",
      "insights_hero": "Complete your <strong>Profile</strong> and <strong>Onboarding</strong> to help AI Reports be more precise. The more complete your profile, the more the advice will reflect your real context.",
      "insights_go_profile": "Go to Profile",
      "insights_overview": "Overview",
      "insights_objectives": "Objectives",
      "insights_percorso": "Path",
      "insights_panoramica": "Overview",
      "insights_affidabilita": "Reliability",
      "insights_habits": "Habits",
      "insights_next_step": "Next step",
      "insights_focus_areas": "Focus areas",
      "insights_directional": "These are directional indications, not definitive assessments.",
      "insights_complete_onboarding": "Complete onboarding to see your focus areas.",
      "insights_goal_short": "Short-term goal",
      "insights_goal_long": "Long-term goal",
      "insights_generated_from": "Generated from onboarding — optimized goals and personalized suggestions.",
      "insights_read_full": "Read full report →",
      "insights_traguardi_title": "Milestones",
      "insights_traguardi_sub": "Every milestone reached is a stepping stone on your journey. Keep practicing to unlock them all.",
      "insights_journey_start": "Your journey starts here. Complete your first session to unlock the first milestone and watch your timeline grow.",
      "insights_sessions": "Sessions",
      "insights_minutes_spoken": "Minutes spoken",
      "insights_unique_words": "Unique words",
      "insights_streak_days": "Streak days",
      "insights_daily_avg": "Daily average",
      "insights_pref_time": "Preferred time",
      "insights_active_days": "Most active days",
      "insights_no_data": "There isn't enough data yet to trace a meaningful profile.",
      "insights_low_confidence": "Low reliability — no sessions completed.",
      "insights_start_sessions": "Start with a few short sessions on different days to let the system detect early patterns.",
      "insights_loading": "Loading…",
      "insights_your_ai_profile": "Your AI profile",
      "vb_guide": "<strong>Style</strong> changes the card color palette. <strong>Mode</strong> colors the header by part of speech (POS) or CEFR level. Words added with <strong>+</strong> are saved to your <em>Build From Known</em> bank.",
      "vb_style": "Style",
      "vb_style_desc": "Card color scheme",
      "vb_color": "Color",
      "vb_mode": "Mode",
      "vb_mode_desc": "Color by word type or level",
      "vb_default": "Default",
      "vb_pos_accent": "POS Accent",
      "vb_cefr_accent": "CEFR Accent",
      "vb_synonyms": "Synonyms",
      "vb_antonyms": "Antonyms",
      "vb_word_family": "Word family",
      "vb_collocations": "Collocations",
      "vb_next_level": "Next level",
      "vb_search_placeholder": "Search a word you know…",
      "vb_empty_title": "Build From What You Know",
      "vb_empty_desc": "Type a word you know and Sottotitoli will show synonyms, antonyms, collocations and related words at your level. The more sessions you do, the more accurate the suggestions.",
      "vb_fullscreen": "Fullscreen",
      "vb_it_guide": "<strong>Style</strong> changes the card color palette. <strong>Mode</strong> colors the header by part of speech (POS) or CEFR level. Words added with <strong>+</strong> are saved to your <em>Italian Builder</em> bank.",
      "vb_it_search_placeholder": "Search an Italian word…",
      "vb_it_search_btn": "Search",
      "vb_it_empty_title": "Italian Vocabulary",
      "vb_it_empty_desc": "Search an Italian word and Sottotitoli will show its definition, English translation and related words. The more sessions you do, the more accurate the suggestions.",
      "wb_review_title": "Words to review",
      "wb_review_refresh": "Refresh",
      "wb_review_mark_all": "Mark all as reviewed",
      "wb_review_bulk_done": "Done",
      "wb_review_col_word": "Word",
      "wb_review_col_cefr": "CEFR",
      "wb_review_col_pos": "POS",
      "wb_review_col_last": "Last review",
      "wb_review_col_interval": "SRS interval",
      "wb_review_col_status": "Status",
      "wb_review_empty_title": "All caught up!",
      "wb_review_empty_desc": "No words to review today. Come back tomorrow or start a new session to add words.",
      "wb_search_placeholder": "Search banks or words…",
      "wb_filter_all": "All",
      "wb_filter_pinned": "Pinned",
      "wb_filter_smart": "Smart",
      "wb_filter_yours": "Yours",
      "wb_pinned": "Pinned",
      "wb_pinned_sub": "Always available",
      "wb_smart": "Smart",
      "wb_smart_sub": "Suggested by Sottotitoli",
      "wb_yours": "Yours",
      "wb_yours_sub": "Your collections",
      "wb_it_pinned": "Pinned",
      "wb_it_pinned_sub": "Always available",
      "wb_it_smart": "Smart",
      "wb_it_smart_sub": "Suggested by Sottotitoli",
      "wb_it_yours": "Yours",
      "wb_it_yours_sub": "Your collections",
      "wb_it_search_placeholder": "Search Italian banks or words…",
      "wb_it_filter_all": "All",
      "wb_it_filter_pinned": "Pinned",
      "wb_it_filter_smart": "Smart",
      "wb_it_filter_custom": "Yours",
      "vt_dashboard": "Dashboard",
      "vt_tasks": "Tasks",
      "vt_review": "Review",
      "gram_my_reports": "My Reports",
      "gram_generate": "Generate Report",
      "gram_my_errors": "My Errors",

      "word_banks": "Word banks",
      "vocabolario": "Vocabulary",
      "grammatica": "Grammar",
      "trascrizioni": "Transcripts",
      "tr_subtitle": "Saved sessions. Transcripts are kept for 30 days, then automatically deleted.",
      "tr_saved_sessions": "Saved sessions",
      "tr_total_minutes": "Total minutes",
      "tr_last_session": "Last session",
      "tr_filter_all": "All",
      "tr_filter_favorites": "Favorites",
      "tr_filter_7days": "Last 7 days",
      "tr_filter_en": "English only",
      "tr_filter_it": "Italian only",
      "tr_filter_translated": "With translation",
      "tr_view": "View:",
      "tr_view_table": "Table",
      "tr_view_drawer": "Drawer",
      "tr_bulk_none": "0 selected",
      "tr_bulk_delete": "Delete selected",
      "tr_policy": "Policy: automatic deletion after 30 days",
      "tr_col_session": "Session",
      "tr_col_date": "Date",
      "tr_col_duration": "Duration",
      "tr_col_language": "Language",
      "tr_col_status": "Status",
      "tr_empty": "No sessions found. Start a caption or translation session.",
      "tr_empty_short": "No sessions found. Start a session.",
      "tr_session_prefix": "Session",
      "tr_expires_in": "Expires in",
      "tr_days_left": "days left",
      "translations": "Translations",
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
      "hero_no_data": "Complete a few sessions to turn your speech into useful feedback on fluency, vocabulary, and progress.",
      "hero_early_data": "We're starting to see early patterns, but with a little more speaking time your feedback will become much more precise and personal.",
      "hero_growing_data": "Your data already reveals useful trends. Open Insights to see what's improving and what deserves more attention.",
      "hero_established_data": "We've identified significant patterns across your sessions. Open Insights for a deeper analysis of strengths, habits, and next steps.",
      "hero_keep_talking": "Keep talking",
      "hero_open_insights": "Open Insights",
      "hero_learn_more": "Learn more",
      "total_sessions": "Total sessions",
      "spoken_time": "Spoken time",
      "unique_words": "Unique words",
      "avg_wpm": "Avg WPM",
      "session_minutes_last_14_days": "Session minutes — last 14 days",
      "estimated_language_profile": "Estimated language profile",

      // Wordbanks
      "word_definition_unavailable": "Definition not yet available.",
      "word_not_in_any_bank": "Not in any word bank.",
      "wordbank_no_words": "No words yet. Start a session or add words.",
      "wordbank_status_new": "New",
      "wordbank_status_learning": "Learning",
      "wordbank_status_known": "Known",
      "wordbank_status_ignored": "Ignored",
      "wordbank_drawer_word_details": "Word details",
      "wordbank_drawer_first_seen": "First seen",
      "wordbank_drawer_unknown": "Unknown",
      "wordbank_col_familiarity": "Familiarity",
      "wordbank_col_lemma": "Lemma",
      "wordbank_col_pos": "POS",
      "wordbank_col_cefr": "CEFR",
      "wordbank_col_first_seen": "First seen",
      "wordbank_col_last_seen": "Last seen",
      "wordbank_col_count": "Count",
      "wordbank_col_actions": "Actions",

      // Review Due
      "review_due_words": "Words to review",
      "review_due_mark_all": "Mark all as reviewed",
      "review_due_all_clear": "All clear!",
      "review_due_empty_desc": "No words to review today. Come back tomorrow or start a new session to add words.",
      "review_due_selected": "selected",
      "review_due_done": "Done",
      "review_due_overdue": "Overdue",
      "review_due_due_today": "Due today",
      "review_due_reviewed_today": "Reviewed today",
      "review_due_mastered": "Mastered",
      "review_due_mark_done": "Mark as reviewed",
      "review_due_never": "Never",

      // Build From What You Know
      "bfwk_title": "Build From What You Know",
      "bfwk_desc": "Type a word you know and Sottotitoli will show synonyms, antonyms, collocations and related words at your level.",
      "bfwk_start_from_known": "Start from a word you know",
      "bfwk_no_known_words": "No known words yet. Start a session and save words!",
      "bfwk_no_suggestions": "No suggestions",
      "bfwk_no_suggestions_desc": "Try another word or another relation.",
      "bfwk_save_word": "Save",
      "bfwk_search_placeholder": "Type a word you know…",
      "bfwk_relation_synonyms": "Synonyms",
      "bfwk_relation_antonyms": "Antonyms",
      "bfwk_relation_word_family": "Word family",
      "bfwk_relation_collocations": "Collocations",
      "bfwk_relation_next_level": "Next level",
      "bfwk_suggestions": "suggestions",
      "bfwk_at_level": "at level",
      "bfwk_saved_to": "saved to Build From Known",
      "bfwk_download_detail": "save the word to see details.",
      "lexical_diversity": "Lexical diversity",
      "buy_minutes_title": "Buy minutes",
      "buy_minutes_desc": "Top up your voice credits in a few clicks. Secure payment with Stripe.",
      "buy_minutes_btn": "Buy minutes",
      "ai_reports_generated": "AI reports generated",
      "generate_report": "Generate report →",
      "daily_minutes": "Daily minutes",
      "completion": "Completion",
      "monthly_goal": "monthly goal",
      "last_30d": "last 30 days",
      "cefr_distribution": "CEFR Distribution",
      "loading": "Loading…",
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
      "default_caption": "Default caption",
      "default_caption_lang": "Caption language",
      "default_translation_pair": "Default translation",
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
      "website_language_short": "Website language",
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
      "emails": "Email",
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

      // ── Purchase ──
      "purchase_secure": "Secure Purchase",
      "purchase_title": "Add minutes and credits",
      "purchase_tls": "TLS Encryption",
      "purchase_pci": "PCI-DSS Level 1",
      "purchase_nostore": "Card data never stored",
      "purchase_stripe": "Stripe Payment",
      "purchase_starter": "Starter",
      "purchase_standard": "Standard",
      "purchase_premium": "Premium",
      "purchase_credits_only": "Credits Only",
      "purchase_popular": "Most Popular",
      "purchase_starter_desc": "60 minutes total",
      "purchase_standard_desc": "300 minutes total",
      "purchase_premium_desc": "900 minutes total",
      "purchase_credits_desc": "100 AI Report credits",
      "purchase_feat_5credits": "+5 AI Report credits",
      "purchase_feat_20credits": "+20 AI Report credits",
      "purchase_feat_60credits": "+60 AI Report credits",
      "purchase_feat_bonus": "+25% loyalty bonus",
      "purchase_feat_unlock": "AI Report unlocked",
      "purchase_feat_support": "Priority support",
      "purchase_howto": "How it works",
      "purchase_howto_text": "Choose one of the four packages above. Minutes can be used for caption and translation. AI credits are used to generate AI Reports after sessions. Minutes and credits never expire.",
      "purchase_product": "Product",
      "purchase_includes": "Includes",
      "purchase_pay_btn": "Go to payment →",
      "purchase_terms": "Terms and Conditions",
      "purchase_terms_text": "Purchased minutes can be used for live caption and translation. AI credits are dedicated exclusively to AI Report generation. Payment is handled by Stripe. Credits are tied to your account and are non-transferable.",
      "purchase_privacy": "Privacy Policy",
      "purchase_privacy_text": "We process your personal data in compliance with GDPR. We only collect email, name, and purchase history. Payment data is handled entirely by Stripe and never touches our servers.",
      "purchase_refunds": "Refunds",
      "purchase_refunds_text": "You have a 14-day right of withdrawal if less than 10% of credits have been used. Purchased credits never expire. In case of technical issues preventing use of the service, you are entitled to a proportional refund.",
      "purchase_footer": "© 2026 Sottotitoli · Crafted with care in Puglia. Made in Italy. | ",
      "terms": "Terms",

      // ── Dynamic ──
      "sessions_completed": "sessions",
      "hours_total": "hours",
      "this_week": "this week",
      "in": "in",
      "help_desc": "Frequently asked questions about reports, credits, and analysis reliability.",
      "prof_complete_onboarding": "Complete onboarding.",
      "prof_other_langs": "Other languages",
      "rai_step1": "Select Analysis Preset",
      "rai_step2": "Source Data",
      "rai_step3": "Analysis Engine",
      "settings_cap_lang": "Caption language",
      "settings_def_trans": "Default translation",
      "settings_desc": "Customize your learning environment and app appearance.",
      "settings_lang_captions": "Language & captions",
      "settings_site_lang": "Site language",
      "sidebar_ai_voice": "AI Voice",
      "sidebar_grammar_hub": "Grammar Hub",
      "sidebar_premium": "PREMIUM",
      "sidebar_vocabulary_builder": "Vocabulary Builder",
      "ss_caption_btn": "Start Caption",
      "ss_caption_desc": "Choose a language and start real-time captions.",
      "ss_caption_hint": "click to change",
      "ss_caption_tag": "Caption",
      "ss_translate_btn": "Start Translation",
      "ss_translate_desc": "Choose the language you speak and the one for subtitles.",
      "ss_translate_tag": "Translate",
      "ss_solo_lingua": "Single<br><em>Language</em>",
      "ss_live_relay": "Live<br><em>Relay</em>",
      "ss_choose_lang": "Choose language",
      "ss_i_speak": "I speak in…",
      "ss_subtitles_in": "Subtitles in…",
      "ss_confirm": "Confirm",
      "topbar_skip_link": "Skip to main content",
      "tr_last_7days": "Last 7 days",
      "wb_new_bank": "New Bank",
      "help_reports_answer": "AI Reports are automatically generated analyses based on your caption and translation sessions. Each report examines different aspects: grammar, vocabulary, fluency, native language interference, and more. Reports only use your real session data — nothing is invented.",
      "help_reliable_answer": "Reliability depends on the number of sessions analyzed. More sessions = more data = more solid analysis. Each report includes a reliability note. Reports do not assign official CEFR certifications and use cautious language.",
      "help_safe_answer": "Yes. Your sessions and reports are visible only to you. Data is used exclusively to generate your personal reports and is not shared with third parties.",
      "help_teacher_answer": "No. It's an analysis and guidance tool: it transforms real data into useful feedback. It doesn't evaluate your pronunciation, doesn't interact with you, and doesn't replace professional judgment.",
      "help_blocked_answer": "Some reports require a minimum number of sessions to be reliable. For example, the \"Recurring Errors\" report needs at least 3 sessions to distinguish an occasional error from a pattern.",
      "help_credits_fail_answer": "No. Credits are only deducted when the report is completed successfully. If a report fails, you can retry it at no additional cost.",
      "help_download_answer": "Yes. Each report can be downloaded as a text file. Reports include the score, date, and full analysis text.",
      "help_profile_answer": "Yes. Goals, industry, feedback preferences, and native language help the AI produce more relevant advice. The more complete your profile, the more reports reflect your real context.",
      "help_reports_preview": "Automatic analyses based on your caption and translation sessions.",
      "help_reliable_preview": "Accuracy and statistical model of results.",
      "help_safe_preview": "Information about data privacy and encryption.",
      "help_teacher_preview": "How to integrate AI feedback with traditional methods.",
      "help_blocked_preview": "Access levels and credit requirements.",
      "help_credits_fail_preview": "Policy on failures and refunds.",
      "help_download_preview": "Available export options.",
      "help_profile_preview": "How your history and settings guide the AI.",
      "gram_dashboard": "Dashboard",
      "gram_explorer": "Explorer",
      "gram_strategy": "Learning Strategy",
      "gram_desc": "Error Analysis Engine — monitor your recurring grammar patterns and train weak points with targeted interventions.",
      "gram_timeline": "Strategic Intervention Timeline",
      "gram_auto_schedule": "Automated Schedule",
      "gram_phase_detection": "Detection",
      "gram_phase_mapping": "Pattern Mapping",
      "gram_phase_drill": "Active Drill",
      "gram_phase_validation": "Validation",
      "gram_current": "Current",
      "gram_training_queue": "Training Queue",
      "gram_training_sub": "Active training patterns",
      "gram_col_point": "Grammar Point",
      "gram_col_start": "Start",
      "gram_col_priority": "Priority",
      "gram_col_mastery": "Mastery",
      "gram_col_next": "Next Review",
      "gram_loading": "Loading…",
      "gram_no_data": "No grammar data yet. Complete a few sessions.",
      "gram_diag_title": "Diagnostic Focus Areas",
      "gram_diag_analytics": "Diagnostic & Predictive Analytics",
      "gram_diag_sub": "Advanced pattern modeling & mastery forecasting",
      "gram_active_pattern": "Active Pattern:",
      "gram_training_params": "Training Parameters",
      "gram_intensity": "Training Intensity",
      "gram_cognitive": "Cognitive Interference",
      "gram_persistence": "Pattern Persistence",
      "gram_momentum": "Current Momentum",
      "gram_target": "Target Frequency",
      "gram_vs_week": "+12% vs last week",
      "gram_strategic": "Strategic Importance",
      "gram_short_obj": "Short-term Objective",
      "gram_short_desc": "Crucial for passing the B2 Speaking Diagnostic.",
      "gram_long_obj": "Long-term Objective",
      "gram_long_desc": "Essential for achieving native-level nuance in professional correspondence.",
      "gram_stability": "Projected Stability",
      "gram_based_on": "Based on current session velocity",
      "gram_path": "Path to Mastery",
      "gram_trajectory": "Current Trajectory",
      "gram_accelerated": "Accelerated (+20% focus)",
      "gram_forecast_title": "Mastery Forecast Logic",
      "gram_forecast_desc": "Increasing study frequency by +20% weekly focus shifts the stability date forward by 6 days.",
      "gram_download": "Download A4",
      "gram_practice": "Practice Now",
      "gram_explanation": "Explanation",
      "gram_formula": "Linguistic Formula",
      "gram_logic": "Step-by-Step Logic",
      "gram_step1_title": "Identify the trigger verb",
      "gram_step1_desc": "Look for verbs like pensare, credere, volere, sperare.",
      "gram_step2_title": "Check for 'che' conjunction",
      "gram_step2_desc": "Ensure there is a change of subject between the main and dependent clause.",
      "gram_step3_title": "Apply the correct tense",
      "gram_step3_desc": "Match the subjunctive tense to the timeframe of the main verb.",
      "gram_examples": "Examples Comparison",
      "gram_en_context": "English Context",
      "gram_it_corrected": "Italian Corrected Form",
      "gram_sonic_title": "Sonic Precision Strategy",
      "gram_sonic_desc": "Based on your latest 48h activity, we've identified a high-frequency collision between English relative clauses and Italian Subjunctive moods. Prioritize the \"Test\" module for Subjunctive Mood to solidify your B2 transition.",
      "gram_start_priority": "Start Priority Intervention",
      "gram_view_full": "View Full Report",
      "rai_my_reports": "My Reports",
      "rai_impostazioni": "Settings",
      "rai_step1": "Select Analysis Preset",
      "rai_step2": "Source Data",
      "rai_step3": "Analysis Engine",
      "rai_grammar": "Grammar",
      "rai_vocabulary": "Vocabulary",
      "rai_training": "Training & Focus",
      "rai_choose_transcripts": "Choose Transcripts",
      "rai_multi_select": "Multi-select specific sessions",
      "rai_choose_desc": "Choose transcripts from your history to analyze. We recommend selecting at least 3 sessions for accurate trending.",
      "rai_standard": "Standard Synthesis",
      "rai_standard_desc": "Optimized for speed and pattern detection.",
      "rai_neural": "Neural Deep Dive",
      "rai_premium_badge": "PREMIUM (+5)",
      "rai_neural_desc": "Advanced structural mapping and nuances.",
      "rai_confirm": "Confirm Configuration",
      "rai_start": "START ANALYSIS",
      "rai_recent": "Recent Generations",
      "rai_recent_sub": "AI analysis based on your recent sessions.",
      "rai_generate_new": "Generate New Report",
      "rai_col_name": "Report Name",
      "rai_col_generated": "Generated",
      "rai_col_status": "Status",
      "rai_col_actions": "Actions",
      "rai_loading_reports": "Loading reports…",
      "rai_no_reports": "No reports yet. Generate your first report.",
      "rai_total_reports": "Total Reports",
      "rai_completed": "Completed",
      "rai_avg_score": "Avg Score",
      "rai_settings_desc": "Customize the analysis engine parameters to optimize your language report generation.",
      "rai_tone": "AI Tone",
      "rai_priority": "Correction Priority",
      "rai_report_lang": "Report Language",
      "rai_save_settings": "Save Settings",
      "rai_synthesis_started": "Synthesis Initialized",
      "rai_synthesis_wait": "Please wait while our linguistic neural net processes your selected transcript history.",
      "rai_abort": "Abort Analysis",
      "settings_site_lang_desc": "The user interface language.",
      "settings_cap_lang_desc": "Default language for subtitles.",
      "settings_def_trans_desc": "Default language pair for translation.",
      "vb_palette": "Palette",
      "vb_color_by": "Color by",
      "vb_none": "None",
      "vb_pos": "POS",
      "vb_cefr": "CEFR",
      "vb_save_to": "Save to",
      "vb_build_from_known": "Build From Known",
      "vb_italian_tab": "🇮🇹 Italian",
      "vb_english_tab": "🇬🇧 English",
      "vb_explore_tab": "🗺️ Explore",
      "vb_search_it_placeholder": "Search an Italian word…",
      "vb_cefr_search_placeholder": "Search a topic...",
      "vb_all_topics": "All topics",
      "vb_relevant_to_me": "Relevant to me",
      "vb_loading_topics": "Loading topics...",
      "vb_back": "Back",
      "vb_by_frequency": "By frequency",
      "vb_by_level": "By level",
      "vb_alpha": "Alphabetical",
      "wb_stats_total": "Total words",
      "wb_stats_due": "Due today",
      "wb_stats_ok": "All clear",
      "wb_stats_new_week": "New this week",
      "wb_stats_known": "Known",
      "wb_stats_learning": "Learning",
      "wb_quiz_tab": "🧠 Quiz",
      "wb_quiz_desc": "Generate a custom quiz from your word banks. Choose the bank, direction, mode, and how many words to include.",
      "wb_quiz_bank": "📦 Word Bank",
      "wb_quiz_direction": "🌐 Direction",
      "wb_quiz_mode": "🎯 Mode",
      "wb_quiz_multiple": "Multiple choice",
      "wb_quiz_open": "Open answer",
      "wb_quiz_count": "🔢 Word count",
      "wb_quiz_generate": "🧠 Generate Quiz",
      "wb_quiz_back": "← Back",
      "wb_quiz_translate": "Translate",
      "wb_quiz_placeholder": "Type the translation…",
      "wb_quiz_verify": "Check",
      "wb_quiz_skip": "Skip →",
      "wb_quiz_finish": "🏁 Finish",
      "wb_quiz_complete": "Quiz Completed!",
      "wb_import_title": "Import Vocabulary Bank",
      "wb_import_desc": "Upload a file — words will be extracted automatically.",
      "wb_create_title": "Create New Bank",
      "wb_create_desc": "Create an empty word bank to fill manually or import later.",
      "wb_cancel": "Cancel",
      "wb_import_btn": "Import & Create Bank",
      "wb_create_btn": "Create Bank",
      "metric_total_sessions": "Total sessions",
      "metric_spoken_time": "Spoken time",
      "metric_unique_words": "Unique words",
      "metric_gse_score": "GSE Score",
      "metric_lexical_div": "Lexical div.",
      "chart_session_minutes": "Session minutes",
      "chart_minutes_total": "Minutes Total",
      "hero_suggested": "Suggested for You",
      "hero_search_placeholder": "Jump to vocabulary…",
      "hero_streak": "Learning Streak",
      "hero_continue": "Continue Learning",
      "hero_transcript": "Transcript",
      "hero_word_bank": "Word Bank",
      "hero_new_session_title": "Start a new session",
      "hero_new_session_desc": "Capture real-time subtitles",
      "hero_new_bank_title": "Create a new word bank",
      "hero_new_bank_desc": "Collect and organize your vocabulary",
      "hero_words": "words",
      "hero_terms": "terms",
      "sidebar_workspace": "Workspace",
      "sidebar_learning": "Learning",
      "sidebar_reports": "Reports",
      "topbar_toggle_theme": "Toggle color theme",
      "topbar_notifications": "Notifications",
      "topbar_account": "Account",
      "prof_edit_name": "Edit name",
      "prof_madrelingua": "Native language",
      "prof_user_id": "User ID",
      "prof_profession": "Profession",
      "prof_why_study": "Why I study",
      "prof_daily_avg": "Daily average",
      "prof_pref_time": "Preferred time",
      "prof_active_days": "Most active days",
      "tr_all": "All",
      "tr_favorites": "★ Favorites",
      "tr_last_7days": "Last 7 days",
      "tr_english_only": "English only",
      "tr_italian_only": "Italian only",
      "tr_with_translation": "With translation",
      "help_system": "System & Reliability",
      "help_what_are_reports": "What are AI Reports?",
      "help_how_reliable": "How reliable are they?",
      "help_data_safe": "Is my data safe?",
      "help_replace_teacher": "Does this replace a teacher?",
      "help_credits": "Credits & Access",
      "help_why_blocked": "Why are some reports locked?",
      "help_credits_fail": "Do credits get used if the report fails?",
      "help_download": "Can I download reports?",
      "help_profile_influence": "Does my profile influence reports?",
      "help_not_found": "Didn't find what you were looking for?",
      "help_contact": "Contact Support",
      "rai_create": "Create Report",
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

  /* ─── UTIL ─── */
  function t(key) {
    var d = (_lang === 'it') ? DICT.it : DICT.en;
    if (d && d[key] !== undefined) return d[key];
    if (DICT.it && DICT.it[key] !== undefined) return DICT.it[key];
    if (DICT.en && DICT.en[key] !== undefined) return DICT.en[key];
    return key;
  }

  function getScope(root) {
    return (root && root.nodeType) ? root : document.body;
  }

  function hasHtml(str) {
    // Detects tags like <strong>, <br>, <span class="x">.
    // Rare false positive "5 < 6" is accepted trade-off for zero-config.
    return /<[a-z][\s\S]*?>/i.test(str);
  }

  /* ─── ORIGINAL CAPTURE ───
   * Captures Italian source-of-truth from the DOM exactly once.
   * Only runs during init or when _lang === 'it' so we never snapshot
   * an already-translated English string as the Italian original.
   */
  function captureOriginals(root, force) {
    if (!force && _lang !== 'it') return;
    var scope = getScope(root);

    scope.querySelectorAll('[data-i18n],[data-i18n-html]').forEach(function(el) {
      if (el.hasAttribute('data-i18n-orig-txt')) return;
      el.setAttribute('data-i18n-orig-txt', el.textContent);
      if (el.innerHTML !== el.textContent) {
        el.setAttribute('data-i18n-orig-html', el.innerHTML);
      }
    });

    scope.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
      if (el.hasAttribute('data-i18n-orig-placeholder')) return;
      el.setAttribute('data-i18n-orig-placeholder', el.getAttribute('placeholder') || '');
    });

    scope.querySelectorAll('[data-i18n-title]').forEach(function(el) {
      if (el.hasAttribute('data-i18n-orig-title')) return;
      el.setAttribute('data-i18n-orig-title', el.getAttribute('title') || '');
    });
  }

  /* ─── CORE APPLY (Guardless Architecture) ─── */
  var _isTranslating = false;

  function apply(root, lang) {
    // Smart-swap: apply('en') means lang='en', root=document
    if (typeof root === 'string') { lang = root; root = null; }
    if (_isTranslating) return;
    _isTranslating = true;
    if (lang) _lang = lang;

    var scope = getScope(root);

    // Capture freshly injected Italian elements before translating
    if (_lang === 'it') captureOriginals(scope);

    try {
      /* 1. data-i18n elements (handles <option> + leaf-safe HTML auto-detect) */
      scope.querySelectorAll('[data-i18n]').forEach(function(el) {
        var key = el.getAttribute('data-i18n');
        if (!key) return;

        // ── BOTH LANGUAGES: use dictionary ──
        var translated = t(key);
        var isOption = el.tagName === 'OPTION';
        var safeForHtml = !isOption && el.children.length === 0;

        if (hasHtml(translated) && safeForHtml) {
          el.innerHTML = translated;
        } else {
          el.textContent = translated;
        }
      });

      /* 2. data-i18n-html (backward compat — redirects to data-i18n logic) */
      scope.querySelectorAll('[data-i18n-html]').forEach(function(el) {
        var key = el.getAttribute('data-i18n-html');
        if (!key) return;
        el.innerHTML = t(key);
      });

      /* 3. Placeholders */
      scope.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
        el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
      });

      /* 4. Titles */
      scope.querySelectorAll('[data-i18n-title]').forEach(function(el) {
        el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
      });

    } finally {
      // MutationObserver callbacks are microtasks; rAF fires after they drain.
      if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(function() { _isTranslating = false; });
      } else {
        setTimeout(function() { _isTranslating = false; }, 0);
      }
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
    apply(null, lang);
    // Dispatch event for page-specific handlers
    window.dispatchEvent(new CustomEvent('i18n-changed', { detail: { lang: lang } }));
    updateToggleBtns();
    return lang;
  }

  /* ─── MUTATION OBSERVER (childList + characterData) ─── */
  var _observer = null;
  var _debounceTimer = null;

  function observe(container) {
    _observer = new MutationObserver(function(mutations) {
      if (_isTranslating) return;

      var relevant = false;
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        if (m.type === 'childList' || m.type === 'characterData') { relevant = true; break; }
      }
      if (!relevant) return;

      clearTimeout(_debounceTimer);
      _debounceTimer = setTimeout(function() {
        if (_isTranslating) return;
        apply();
        // Inject lang toggle into any newly-added user dropdowns
        if (typeof injectLangToggle === 'function') injectLangToggle();
      }, 60);
    });

    _observer.observe(container || document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  async function init() {
    if (_loaded) return _lang;
    _loaded = true;
    var lang = detectLang();

    // Capture Italian originals FIRST, before any translation
    captureOriginals(null, true);

    // Start the observer
    observe(document.body);

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

  /* ═══════════════════════════════════════════════════════
     PUBLIC API
     ═══════════════════════════════════════════════════════ */
  window.I18n = {
    init: init,
    setLang: setLang,
    t: t,
    apply: apply,
    getLang: function(){ return _lang; },
    DICT: DICT,

    /** Translate a single element manually (e.g. after dynamic injection). */
    translateElement: function(el, key) {
      key = key || el.getAttribute('data-i18n');
      if (!key) return;
      if (_lang === 'it') captureOriginals(el, true);
      var prev = _isTranslating;
      _isTranslating = true;
      try {
        if (_lang === 'it') {
          var h = el.getAttribute('data-i18n-orig-html');
          if (h !== null) { el.innerHTML = h; }
          else { var txt = el.getAttribute('data-i18n-orig-txt'); if (txt !== null) el.textContent = txt; }
        } else {
          var trans = t(key);
          var safeForHtml = el.tagName !== 'OPTION' && el.children.length === 0;
          if (hasHtml(trans) && safeForHtml) { el.innerHTML = trans; }
          else { el.textContent = trans; }
        }
      } finally { _isTranslating = prev; }
    },

    /** One-time migration helper. Run in DevTools, commit HTML, remove helper. */
    annotate: function(root) {
      var rev = {};
      var it = DICT.it, en = DICT.en;
      for (var k in it) { if (en[k] && en[k] !== it[k] && !rev[it[k]]) rev[it[k]] = k; }
      var w = document.createTreeWalker(getScope(root), NodeFilter.SHOW_TEXT, null, false);
      var n;
      while ((n = w.nextNode())) {
        var txt = n.textContent.trim();
        if (rev[txt]) {
          var p = n.parentElement;
          if (p && !p.closest('[data-i18n]') && !p.getAttribute('data-i18n')) {
            p.setAttribute('data-i18n', rev[txt]);
          }
        }
      }
      console.log('I18n.annotate: done. Call I18n.apply() to preview.');
    }
  };

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ init(); });
  } else {
    init();
  }

})();