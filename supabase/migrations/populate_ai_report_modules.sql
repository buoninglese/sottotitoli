-- Populate ai_report_modules — required for session_ai_reports FK constraint
-- Run this in Supabase Dashboard → SQL Editor
-- https://supabase.com/dashboard/project/qzqmuegbpmvqrjrlfbgk/sql/new

INSERT INTO ai_report_modules (id, label, description, family, default_rule) VALUES
(1,  'Grammar & Accuracy',       'Grammar for Cambridge B1-C2',                'cambridge',   'Complex structures, verb tenses, errors.'),
(2,  'Vocabulary Range',          'Lexical resource for Cambridge',              'cambridge',   'Range, collocations, idioms, topic deployment.'),
(3,  'Fluency & Coherence',       'Fluency for Cambridge speaking',              'cambridge',   'Speech flow, discourse markers, coherence.'),
(4,  'Pronunciation',             'Pronunciation for Cambridge',                 'cambridge',   'Sounds, stress, intonation, connected speech.'),
(5,  'Professional Communication','Business formality and tone',                 'business',    'Register, professional tone, vocabulary.'),
(6,  'Meetings & Presentations',  'Business meetings skills',                    'business',    'Openings, turn-taking, persuasion, signposting.'),
(7,  'Business Vocabulary',       'Industry terminology',                        'business',    'Industry terms, business idioms, register.'),
(8,  'Academic Discourse',        'Academic speaking',                           'academic',    'Hedging, qualifiers, citation, critical thinking.'),
(9,  'Research Communication',    'Research discussion',                         'academic',    'Methodology, results, technical terminology.'),
(10, 'Academic Vocabulary',       'Academic terminology',                        'academic',    'AWL coverage, subject terms, nominalization.'),
(11, 'Discourse Analysis',        'Discourse and cohesion',                      'linguistic',  'Markers, cohesion devices, topic management.'),
(12, 'Syntax & Complexity',       'Syntactic complexity',                        'linguistic',  'Sentence length, clauses, complexity index.'),
(13, 'Lexical Analysis',          'Lexical statistics',                          'linguistic',  'TTR, lexical density, frequency distribution.'),
(14, 'Filler Analysis',           'Fillers and disfluency',                      'linguistic',  'Filler distribution, false starts, self-repairs.')
ON CONFLICT (id) DO NOTHING;
