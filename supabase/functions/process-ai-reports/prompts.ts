// AI Analysis Module Prompts
<<<<<<< HEAD
// Maps module IDs to specialized assessment prompts
// IDs 1–14 match the INSERT order in ai_report_modules.sql
=======
// Maps module IDs (1-14, matching ai_report_modules.sql INSERT order) to specialized assessment prompts
>>>>>>> e48fc234881925681ad175f4a96dd305295e7255

export const MODULE_PROMPTS: Record<number, { system: string; user: (transcript: string) => string }> = {
<<<<<<< HEAD
  // === CAMBRIDGE MODULES (1–4) ===
=======
  // ========================================================
  // CAMBRIDGE MODULES (SQL rows 1-4)
  // ========================================================
>>>>>>> e48fc234881925681ad175f4a96dd305295e7255

<<<<<<< HEAD
  // 1. Grammar & Accuracy
  1: {
    system: `You are an expert Cambridge English examiner specializing in Grammatical Range & Accuracy assessment for speaking tests (B1-C2 levels).`,
=======
  // 1. Grammar & Accuracy
  1: {
    system: `You are an expert Cambridge English examiner specializing in Grammatical Range & Accuracy assessment.`,
>>>>>>> e48fc234881925681ad175f4a96dd305295e7255
    user: (transcript: string) => `Analyze this speaking transcript for Grammar & Accuracy:

${transcript}

Provide:
1. Grammatical Range (variety of structures used)
2. Accuracy Assessment (error frequency and type)
3. Specific Grammar Errors with corrections
4. Strengths identified
5. Targeted Practice Recommendations
6. CEFR Level Estimate (B1-C2)

Be specific with examples from the transcript. Format: Professional, concise, actionable.`
  },

<<<<<<< HEAD
  // 2. Vocabulary Range
  2: {
    system: `You are an expert Cambridge English examiner specializing in Lexical Resource assessment.`,
    user: (transcript: string) => `Analyze this speaking transcript for Vocabulary Range:
=======
  // 2. Vocabulary Range
  2: {
    system: `You are an expert Cambridge English examiner specializing in Lexical Resource assessment.`,
    user: (transcript: string) => `Analyze this speaking transcript for Vocabulary Range:

${transcript}

Provide:
1. Lexical Range Score (variety and sophistication)
2. Topic-Specific Vocabulary usage
3. Collocations and Phrases identified
4. Overused words/phrases
5. Vocabulary gaps
6. Recommendations for expansion
7. CEFR Level Estimate`
  },

  // 3. Fluency & Coherence
  3: {
    system: `You are an expert Cambridge English examiner specializing in Fluency & Coherence assessment for speaking tests (B1-C2 levels).`,
    user: (transcript: string) => `Analyze this speaking transcript for Fluency & Coherence:

${transcript}

Provide:
1. Overall Fluency Score (rate of speech, hesitations, pauses)
2. Coherence Assessment (logical organization, discourse markers)
3. Specific Examples from transcript
4. Improvement Recommendations
5. CEFR Level Estimate (B1-C2)

Format: Professional, concise, actionable.`
  },

  // 4. Pronunciation
  4: {
    system: `You are an expert Cambridge English examiner specializing in Pronunciation assessment.`,
    user: (transcript: string) => `Analyze this speaking transcript for Pronunciation features:

${transcript}

Provide:
1. Intelligibility Score
2. Intonation & Stress patterns
3. Problem sounds or patterns identified
4. Word/sentence stress issues
5. Recommendations for improvement
6. CEFR Level Estimate

Note: Base analysis on text patterns that suggest pronunciation issues (repeated words, discourse markers suggesting uncertainty).`
  },

  // ========================================================
  // BUSINESS MODULES (SQL rows 5-7)
  // ========================================================
>>>>>>> e48fc234881925681ad175f4a96dd305295e7255

<<<<<<< HEAD
${transcript}

Provide:
1. Lexical Range Score (variety and sophistication)
2. Topic-Specific Vocabulary usage
3. Collocations and Phrases identified
4. Overused words/phrases
5. Vocabulary gaps
6. Recommendations for expansion
7. CEFR Level Estimate`
  },

  // 3. Fluency & Coherence
  3: {
    system: `You are an expert Cambridge English examiner specializing in Fluency & Coherence assessment.`,
    user: (transcript: string) => `Analyze this speaking transcript for Fluency & Coherence:

${transcript}
=======
  // 5. Professional Communication
  5: {
    system: `You are an expert business English assessor specializing in formal register and professional communication.`,
    user: (transcript: string) => `Analyze this speaking transcript for Business Professional Communication:
>>>>>>> e48fc234881925681ad175f4a96dd305295e7255

Provide:
1. Overall Fluency Score (rate of speech, hesitations, pauses)
2. Coherence Assessment (logical organization, discourse markers)
3. Specific Examples from transcript
4. Improvement Recommendations
5. CEFR Level Estimate (B1-C2)`
  },

  // 4. Pronunciation
  4: {
    system: `You are an expert Cambridge English examiner specializing in Pronunciation assessment.`,
    user: (transcript: string) => `Analyze this speaking transcript for Pronunciation features:

${transcript}

Provide:
1. Intelligibility Score
2. Intonation & Stress patterns
3. Problem sounds or patterns identified
4. Recommendations for improvement
5. CEFR Level Estimate

Note: Base analysis on text patterns that suggest pronunciation issues.`
  },

  // === BUSINESS MODULES (5–7) ===

  // 5. Professional Communication
  5: {
    system: `You are an expert business English assessor specializing in professional communication.`,
    user: (transcript: string) => `Analyze this speaking transcript for Professional Communication:

${transcript}

Provide:
1. Register Appropriateness (formal vs informal language)
2. Professional Tone Assessment
3. Business Vocabulary usage
4. Clarity and conciseness
5. Confidence and assertiveness
6. Recommendations for professional contexts`
  },

<<<<<<< HEAD
  // 6. Meetings & Presentations
  6: {
    system: `You are an expert business communication coach specializing in meetings and presentations.`,
    user: (transcript: string) => `Analyze this speaking transcript for Meetings & Presentations:
=======
  // 6. Meetings & Presentations
  6: {
    system: `You are an expert business communication coach specializing in presentation skills assessment.`,
    user: (transcript: string) => `Analyze this speaking transcript for Meetings & Presentations:
>>>>>>> e48fc234881925681ad175f4a96dd305295e7255

${transcript}

Provide:
1. Opening and closing techniques
2. Turn-taking and interruption management
3. Persuasion and argumentation skills
4. Signposting language effectiveness
5. Question handling ability
6. Actionable business communication tips`
  },

<<<<<<< HEAD
  // 7. Business Vocabulary
  7: {
    system: `You are an expert business English assessor specializing in professional vocabulary.`,
    user: (transcript: string) => `Analyze this speaking transcript for Business Vocabulary:
=======
  // 7. Business Vocabulary
  7: {
    system: `You are an expert business English assessor specializing in industry-specific terminology and business idioms.`,
    user: (transcript: string) => `Analyze this speaking transcript for Business Vocabulary:
>>>>>>> e48fc234881925681ad175f4a96dd305295e7255

<<<<<<< HEAD
=======
${transcript}

Provide:
1. Industry and field-specific terminology usage
2. Business idioms and phrasal verbs
3. Financial/commercial language
4. Formal vs informal business register
5. Suggestions for expanding professional lexicon
6. Comparison to business communication standards`
  },

  // ========================================================
  // ACADEMIC MODULES (SQL rows 8-10)
  // ========================================================

  // 8. Academic Discourse
  8: {
    system: `You are an expert academic English assessor specializing in academic discourse analysis.`,
    user: (transcript: string) => `Analyze this speaking transcript for Academic Discourse:

>>>>>>> e48fc234881925681ad175f4a96dd305295e7255
${transcript}

Provide:
1. Industry and field-specific terminology
2. Business idioms and phrasal verbs
3. Financial/commercial language usage
4. Formal vs informal business register
5. Suggestions for expanding professional lexicon`
  },

<<<<<<< HEAD
  // === ACADEMIC MODULES (8–10) ===
=======
  // 9. Research Communication
  9: {
    system: `You are an expert academic skills assessor specializing in critical thinking evaluation.`,
    user: (transcript: string) => `Analyze this speaking transcript for Research Communication:
>>>>>>> e48fc234881925681ad175f4a96dd305295e7255

  // 8. Academic Discourse
  8: {
    system: `You are an expert academic English assessor specializing in academic discourse.`,
    user: (transcript: string) => `Analyze this speaking transcript for Academic Discourse:

${transcript}

Provide:
<<<<<<< HEAD
1. Use of hedging and academic qualifiers
2. Citation and referencing in speech
3. Critical thinking and argumentation
4. Abstract and complex idea expression
5. Objective vs subjective language balance`
=======
1. Methodology description clarity
2. Results and data presentation
3. Limitations and implications discussion
4. Technical terminology accuracy
5. Ability to respond to academic questioning
6. Recommendations for academic development`
>>>>>>> e48fc234881925681ad175f4a96dd305295e7255
  },

<<<<<<< HEAD
  // 9. Research Communication
  9: {
    system: `You are an expert academic skills assessor specializing in research communication.`,
    user: (transcript: string) => `Analyze this speaking transcript for Research Communication:
=======
  // 10. Academic Vocabulary
  10: {
    system: `You are an expert academic English assessor specializing in academic vocabulary and terminology.`,
    user: (transcript: string) => `Analyze this speaking transcript for Academic Vocabulary:
>>>>>>> e48fc234881925681ad175f4a96dd305295e7255

<<<<<<< HEAD
=======
${transcript}

Provide:
1. Academic word list coverage
2. Subject-specific terminology
3. Abstract noun usage
4. Nominalization patterns
5. Formal register maintenance
6. Comparison against academic corpus standards`
  },

  // ========================================================
  // LINGUISTIC ANALYSIS MODULES (SQL rows 11-14)
  // ========================================================

  // 11. Discourse Analysis
  11: {
    system: `You are an expert linguist specializing in discourse analysis and cohesion.`,
    user: (transcript: string) => `Analyze this speaking transcript for Discourse Analysis:

>>>>>>> e48fc234881925681ad175f4a96dd305295e7255
${transcript}

Provide:
1. Methodology description clarity
2. Results and data presentation
3. Limitations and implications discussion
4. Technical terminology accuracy
5. Ability to respond to academic questioning`
  },

<<<<<<< HEAD
  // 10. Academic Vocabulary
  10: {
    system: `You are an expert academic English assessor specializing in academic vocabulary.`,
    user: (transcript: string) => `Analyze this speaking transcript for Academic Vocabulary:
=======
  // 12. Syntax & Complexity
  12: {
    system: `You are an expert computational linguist specializing in language complexity measurement.`,
    user: (transcript: string) => `Analyze this speaking transcript for Syntax & Complexity:
>>>>>>> e48fc234881925681ad175f4a96dd305295e7255

${transcript}

Provide:
1. Academic word list coverage
2. Subject-specific terminology
3. Abstract noun usage
4. Nominalization patterns
5. Formal register maintenance`
  },

<<<<<<< HEAD
  // === LINGUISTIC ANALYSIS MODULES (11–14) ===
=======
  // 13. Lexical Analysis
  13: {
    system: `You are an expert error analysis specialist in second language acquisition.`,
    user: (transcript: string) => `Perform comprehensive Lexical Analysis on this transcript:
>>>>>>> e48fc234881925681ad175f4a96dd305295e7255

  // 11. Discourse Analysis
  11: {
    system: `You are an expert linguist specializing in discourse analysis and cohesion.`,
    user: (transcript: string) => `Analyze this speaking transcript for Discourse Analysis:

${transcript}

Provide:
<<<<<<< HEAD
1. Discourse markers and connectives usage
2. Cohesion and coherence devices
3. Topic management and development
4. Reference and ellipsis patterns
5. Pragmatic features (politeness, indirectness, implicature)`
=======
1. Type-token ratio interpretation
2. Lexical density metrics
3. Word frequency distribution
4. Semantic fields and domains
5. Lexical sophistication indices
6. Recommendations for vocabulary development`
>>>>>>> e48fc234881925681ad175f4a96dd305295e7255
  },

<<<<<<< HEAD
  // 12. Syntax & Complexity
  12: {
    system: `You are an expert computational linguist specializing in syntactic analysis.`,
    user: (transcript: string) => `Analyze this speaking transcript for Syntax & Complexity:
=======
  // 14. Filler Analysis
  14: {
    system: `You are an expert conversation analyst specializing in interactive competence.`,
    user: (transcript: string) => `Analyze this speaking transcript for Filler Analysis:
>>>>>>> e48fc234881925681ad175f4a96dd305295e7255

${transcript}

Provide:
<<<<<<< HEAD
1. Sentence length variation
2. Clause types and subordination
3. Syntactic complexity index
4. Passive vs active voice distribution
5. Coordination and subordination balance. Include quantitative metrics.`
  },

  // 13. Lexical Analysis
  13: {
    system: `You are an expert linguist specializing in lexical statistics and frequency analysis.`,
    user: (transcript: string) => `Analyze this speaking transcript for Lexical Analysis:

${transcript}

Provide:
1. Type-token ratio assessment
2. Lexical density
3. Word frequency distribution
4. Semantic fields and domains
5. Lexical sophistication indices. Provide comparative benchmarks.`
  },

  // 14. Filler Analysis
  14: {
    system: `You are an expert linguist specializing in disfluency analysis.`,
    user: (transcript: string) => `Analyze this speaking transcript for Filler Analysis:

${transcript}

Provide:
1. Filler word distribution (um, uh, er, etc.)
2. False starts and self-repairs
3. Pause patterns (estimated from transcript)
4. Repetition types
5. Strategic vs problematic disfluencies`
=======
1. Filler word distribution (um, uh, er, like, you know, etc.)
2. False starts and self-repairs
3. Pause patterns (estimated from transcript)
4. Repetition types and frequency
5. Strategic vs problematic disfluencies
6. Recommendations for reducing fillers and improving fluency`
>>>>>>> e48fc234881925681ad175f4a96dd305295e7255
  }
};

<<<<<<< HEAD
export function getModulePrompt(moduleId: number, transcript: string) {
  const prompt = MODULE_PROMPTS[moduleId];
  if (!prompt) {
    throw new Error(`No prompt found for module ID: ${moduleId}`);
  }
=======
// Helper function to get the prompt for a specific module
export function getModulePrompt(moduleId: number, transcript: string): { system: string; user: string } | null {
  const module = MODULE_PROMPTS[moduleId];
  if (!module) return null;
>>>>>>> e48fc234881925681ad175f4a96dd305295e7255
  return {
    system: module.system,
    user: module.user(transcript)
  };
}
