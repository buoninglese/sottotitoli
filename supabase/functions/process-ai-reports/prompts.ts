// AI Analysis Module Prompts
// Maps module IDs (1-14, matching ai_report_modules.sql INSERT order) to specialized assessment prompts

export const MODULE_PROMPTS: Record<number, { system: string; user: (transcript: string) => string }> = {
  // ========================================================
  // CAMBRIDGE MODULES (SQL rows 1-4)
  // ========================================================

  // 1. Grammar & Accuracy
  1: {
    system: `You are an expert Cambridge English examiner specializing in Grammatical Range & Accuracy assessment.`,
    user: (transcript: string) => `Analyze this speaking transcript for Grammar & Accuracy:

${transcript}

Provide:
1. Grammatical Range (variety of structures used)
2. Accuracy Assessment (error frequency and type)
3. Specific Grammar Errors with corrections
4. Strengths identified
5. Targeted Practice Recommendations
6. CEFR Level Estimate

Be specific with examples from the transcript.`
  },

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

  // 5. Professional Communication
  5: {
    system: `You are an expert business English assessor specializing in formal register and professional communication.`,
    user: (transcript: string) => `Analyze this speaking transcript for Business Professional Communication:

${transcript}

Provide:
1. Register Appropriateness (formal vs informal language)
2. Professional Tone Assessment
3. Business Vocabulary usage
4. Examples of formal/informal language
5. Recommendations for professional contexts
6. Suitability for business settings`
  },

  // 6. Meetings & Presentations
  6: {
    system: `You are an expert business communication coach specializing in presentation skills assessment.`,
    user: (transcript: string) => `Analyze this speaking transcript for Meetings & Presentations:

${transcript}

Provide:
1. Structure & Organization (intro, body, conclusion)
2. Signposting language used
3. Engagement techniques
4. Clarity of main points
5. Persuasiveness
6. Recommendations for business presentations`
  },

  // 7. Business Vocabulary
  7: {
    system: `You are an expert business English assessor specializing in industry-specific terminology and business idioms.`,
    user: (transcript: string) => `Analyze this speaking transcript for Business Vocabulary:

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

${transcript}

Provide:
1. Academic Vocabulary usage
2. Hedging and cautious language
3. Citation and referencing language
4. Objectivity vs subjectivity
5. Complexity of argumentation
6. Suitability for academic contexts`
  },

  // 9. Research Communication
  9: {
    system: `You are an expert academic skills assessor specializing in critical thinking evaluation.`,
    user: (transcript: string) => `Analyze this speaking transcript for Research Communication:

${transcript}

Provide:
1. Methodology description clarity
2. Results and data presentation
3. Limitations and implications discussion
4. Technical terminology accuracy
5. Ability to respond to academic questioning
6. Recommendations for academic development`
  },

  // 10. Academic Vocabulary
  10: {
    system: `You are an expert academic English assessor specializing in academic vocabulary and terminology.`,
    user: (transcript: string) => `Analyze this speaking transcript for Academic Vocabulary:

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

${transcript}

Provide:
1. Frequency and variety of discourse markers
2. Appropriate usage (additive, contrastive, sequential)
3. Overused markers
4. Missing marker types
5. Impact on coherence
6. Recommendations for balanced usage`
  },

  // 12. Syntax & Complexity
  12: {
    system: `You are an expert computational linguist specializing in language complexity measurement.`,
    user: (transcript: string) => `Analyze this speaking transcript for Syntax & Complexity:

${transcript}

Provide:
1. Sentence length averages
2. Subordination frequency
3. Clause complexity
4. Syntactic variety
5. Lexical density estimate
6. Comparison to CEFR benchmarks`
  },

  // 13. Lexical Analysis
  13: {
    system: `You are an expert error analysis specialist in second language acquisition.`,
    user: (transcript: string) => `Perform comprehensive Lexical Analysis on this transcript:

${transcript}

Provide:
1. Type-token ratio interpretation
2. Lexical density metrics
3. Word frequency distribution
4. Semantic fields and domains
5. Lexical sophistication indices
6. Recommendations for vocabulary development`
  },

  // 14. Filler Analysis
  14: {
    system: `You are an expert conversation analyst specializing in interactive competence.`,
    user: (transcript: string) => `Analyze this speaking transcript for Filler Analysis:

${transcript}

Provide:
1. Filler word distribution (um, uh, er, like, you know, etc.)
2. False starts and self-repairs
3. Pause patterns (estimated from transcript)
4. Repetition types and frequency
5. Strategic vs problematic disfluencies
6. Recommendations for reducing fillers and improving fluency`
  }
};

// Helper function to get the prompt for a specific module
export function getModulePrompt(moduleId: number, transcript: string): { system: string; user: string } | null {
  const module = MODULE_PROMPTS[moduleId];
  if (!module) return null;
  return {
    system: module.system,
    user: module.user(transcript)
  };
}
