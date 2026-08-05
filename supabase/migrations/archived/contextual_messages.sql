-- ============================================================================
-- Contextual Messaging Engine — for panoramica.html dynamic banners
-- Run in Supabase SQL Editor
-- ============================================================================

CREATE TABLE IF NOT EXISTS contextual_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trigger_key TEXT NOT NULL UNIQUE,
  title TEXT,
  message_it TEXT NOT NULL,
  action_label TEXT,
  action_panel TEXT,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed with initial messages
INSERT INTO contextual_messages (trigger_key, message_it, action_label, action_panel, priority) VALUES
  ('onboarding', 'Benvenuto! Avvia la tua prima sessione per iniziare il tuo percorso. 🚀', 'Inizia sessione', NULL, 100),
  ('no_sessions_7d', 'Sono passati più di 7 giorni dall''ultima sessione. Riprendi oggi! 💪', 'Inizia sessione', NULL, 90),
  ('streak_3', '🔥 3 giorni di fila! Stai costruendo un''abitudine solida.', NULL, NULL, 80),
  ('streak_7', '🔥🔥 7 giorni di fila! Sei in un momento d''oro.', NULL, NULL, 70),
  ('streak_14', '🏆 14 giorni consecutivi! Sei inarrestabile.', NULL, NULL, 60),
  ('first_report_ready', 'Hai abbastanza sessioni per generare il tuo primo Report AI. Riceverai un''analisi completa.', 'Genera Report', 'report-ai', 85),
  ('review_due', 'Hai {count} parole da ripassare oggi. Un breve ripasso fa la differenza.', 'Vai al Word Bank', 'wordbanks', 75),
  ('cefr_milestone', '🎉 Hai raggiunto il 50% del livello {level}! Continua così.', NULL, NULL, 65),
  ('no_tasks', 'Definisci un obiettivo nei Compiti per monitorare i tuoi progressi.', 'Vai ai Compiti', 'insights', 50),
  ('pro_trial_ending', '⏰ La tua prova Pro scade tra {days} giorni. Passa a Pro per non perdere l''accesso.', 'Scopri Pro', NULL, 95)
ON CONFLICT (trigger_key) DO UPDATE SET
  message_it = EXCLUDED.message_it,
  action_label = EXCLUDED.action_label,
  action_panel = EXCLUDED.action_panel,
  priority = EXCLUDED.priority;

-- RLS: anyone can read, only authenticated can update (for admin)
ALTER TABLE contextual_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read messages" ON contextual_messages;
CREATE POLICY "Anyone can read messages" ON contextual_messages FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated can manage messages" ON contextual_messages;
CREATE POLICY "Authenticated can manage messages" ON contextual_messages FOR ALL USING (auth.role() = 'authenticated');
