-- AI Report Modules for Sottotitoli Analysis
-- Insert these rows into the ai_report_modules table in Supabase

-- Cambridge Family Modules
INSERT INTO ai_report_modules (label, description, family, default_rule) VALUES
('Grammar & Accuracy', 'Analyze grammatical structures, verb tenses, and accuracy appropriate for Cambridge English exams (B1-C2 levels)', 'cambridge', 'Evaluate the transcript for grammatical range and accuracy. Identify: 1) Complex sentence structures used, 2) Verb tense variety and correct usage, 3) Common grammatical errors and their frequency, 4) Suggestions aligned with Cambridge English criteria. Provide specific examples from the transcript.'),

('Vocabulary Range', 'Assess lexical resource, collocations, and topic-specific vocabulary for Cambridge standards', 'cambridge', 'Analyze vocabulary usage in the transcript. Assess: 1) Range of vocabulary (basic to advanced), 2) Use of collocations and idiomatic expressions, 3) Topic-specific vocabulary deployment, 4) Repetition and overuse of words, 5) Recommendations for vocabulary expansion relevant to Cambridge exams.'),

('Fluency & Coherence', 'Evaluate speaking flow, hesitations, and logical organization for Cambridge speaking tests', 'cambridge', 'Examine fluency and coherence. Report on: 1) Speech flow and pace, 2) Use of discourse markers and linking words, 3) Logical organization of ideas, 4) Hesitations and self-corrections, 5) Overall coherence and how well ideas connect. Provide Cambridge band descriptor alignment.'),

('Pronunciation', 'Assessment of pronunciation features relevant to Cambridge speaking criteria', 'cambridge', 'Evaluate pronunciation aspects: 1) Individual sound production, 2) Word stress patterns, 3) Sentence intonation, 4) Connected speech features, 5) Intelligibility for international communication. Note: Analysis based on transcription patterns and reported speech characteristics.');

-- Business Family Modules
INSERT INTO ai_report_modules (label, description, family, default_rule) VALUES
('Professional Communication', 'Evaluate business communication skills including formality, clarity, and professional tone', 'business', 'Analyze professional communication effectiveness. Assess: 1) Appropriate level of formality for business context, 2) Clarity and conciseness of message delivery, 3) Professional vocabulary and register, 4) Ability to structure business discourse, 5) Confidence and assertiveness in communication.'),

('Meetings & Presentations', 'Assessment of skills for business meetings, presentations, and negotiations', 'business', 'Evaluate meeting and presentation competencies: 1) Opening and closing techniques, 2) Turn-taking and interruption management, 3) Persuasion and argumentation skills, 4) Question handling, 5) Use of signposting language. Provide actionable business communication tips.'),

('Business Vocabulary', 'Analysis of industry-specific terminology and business idioms', 'business', 'Review business vocabulary usage: 1) Industry and field-specific terminology, 2) Business idioms and phrasal verbs, 3) Financial/commercial language, 4) Formal vs informal business register, 5) Suggestions for expanding professional lexicon.');

-- Academic Family Modules
INSERT INTO ai_report_modules (label, description, family, default_rule) VALUES
('Academic Discourse', 'Evaluate academic speaking skills for lectures, seminars, and presentations', 'academic', 'Analyze academic discourse features: 1) Use of hedging and academic qualifiers, 2) Citation and referencing in speech, 3) Critical thinking and argumentation, 4) Abstract and complex idea expression, 5) Objective vs subjective language balance.'),

('Research Communication', 'Assessment of ability to discuss research, methodology, and findings', 'academic', 'Evaluate research communication skills: 1) Methodology description clarity, 2) Results and data presentation, 3) Limitations and implications discussion, 4) Technical terminology accuracy, 5) Ability to respond to academic questioning.'),

('Academic Vocabulary', 'Analysis of subject-specific terminology and academic word list coverage', 'academic', 'Review academic vocabulary: 1) Academic word list coverage, 2) Subject-specific terminology, 3) Abstract noun usage, 4) Nominalization patterns, 5) Formal register maintenance. Compare against academic corpus standards.');

-- Linguistic Analysis Family Modules
INSERT INTO ai_report_modules (label, description, family, default_rule) VALUES
('Discourse Analysis', 'Detailed linguistic analysis of discourse markers, cohesion, and pragmatics', 'linguistic', 'Conduct discourse analysis: 1) Discourse markers and connectives usage, 2) Cohesion and coherence devices, 3) Topic management and development, 4) Reference and ellipsis patterns, 5) Pragmatic features (politeness, indirectness, implicature).'),

('Syntax & Complexity', 'Analysis of syntactic structures and sentence complexity metrics', 'linguistic', 'Analyze syntactic features: 1) Sentence length variation, 2) Clause types and subordination, 3) Syntactic complexity index, 4) Passive vs active voice distribution, 5) Coordination and subordination balance. Include quantitative metrics.'),

('Lexical Analysis', 'Comprehensive lexical statistics including type-token ratio and frequency patterns', 'linguistic', 'Perform lexical analysis: 1) Type-token ratio (already calculated), 2) Lexical density, 3) Word frequency distribution, 4) Semantic fields and domains, 5) Lexical sophistication indices. Provide comparative benchmarks.'),

('Filler Analysis', 'Detailed examination of fillers, hesitations, and disfluency patterns', 'linguistic', 'Examine disfluency patterns: 1) Filler word distribution (um, uh, er, etc.), 2) False starts and self-repairs, 3) Pause patterns (estimated from transcript), 4) Repetition types, 5) Strategic vs problematic disfluencies. Already have fillers_per_minute metric.');

-- USAGE INSTRUCTIONS:
-- 1. Open your Supabase project dashboard
-- 2. Go to the SQL Editor
-- 3. Copy and paste each INSERT statement above
-- 4. Run the queries to populate the ai_report_modules table
-- 5. The Analysis page will now show module buttons for each family
-- 6. Users can click modules to request AI-generated reports on their sessions

-- Total modules: 14
--  • Cambridge: 4 modules
--  • Business: 3 modules
--  • Academic: 3 modules
--  • Linguistic Analysis: 4 modules
