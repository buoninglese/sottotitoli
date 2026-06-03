// AI Analysis Module Prompts
// Maps module IDs (1-14) to specialized assessment prompts

export const MODULE_PROMPTS: Record<number, { system: string; user: (transcript: string) => string }> = {
  // ========================================================
  // CAMBRIDGE MODULES (1-4)
  // ========================================================

  1: {
    system: `You are an expert Cambridge English examiner specializing in Grammatical Range & Accuracy assessment for speaking tests (B1-C2 levels).`,
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

Note: Base analysis on text patterns that suggest pronunciation issues.`
  },

  // ========================================================
  // BUSINESS MODULES (5-7)
  // ========================================================

  5: {
    system: `You are an expert business English assessor specializing in formal register and professional communication.`,
    user: (transcript: string) => `Analyze this speaking transcript for Business Professional Communication:

${transcript}

Provide:
1. Register Appropriateness (formal vs informal language)
2. Professional Tone Assessment
3. Business Vocabulary usage
4. Clarity and conciseness
5. Confidence and assertiveness
6. Recommendations for professional contexts`
  },

  6: {
    system: `You are an expert business communication coach specializing in presentation skills assessment.`,
    user: (transcript: string) => `Analyze this speaking transcript for Meetings & Presentations:

${transcript}

Provide:
1. Opening and closing techniques
2. Turn-taking and interruption management
3. Persuasion and argumentation skills
4. Signposting language effectiveness
5. Question handling ability
6. Actionable business communication tips`
  },

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
  // ACADEMIC MODULES (8-10)
  // ========================================================

  8: {
    system: `You are an expert academic English assessor specializing in academic discourse analysis.`,
    user: (transcript: string) => `Analyze this speaking transcript for Academic Discourse:

${transcript}

Provide:
1. Use of hedging and academic qualifiers
2. Citation and referencing in speech
3. Critical thinking and argumentation
4. Abstract and complex idea expression
5. Objective vs subjective language balance`
  },

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
  // LINGUISTIC ANALYSIS MODULES (11-14)
  // ========================================================

  11: {
    system: `You are an expert linguist specializing in discourse analysis and cohesion.`,
    user: (transcript: string) => `Analyze this speaking transcript for Discourse Analysis:

${transcript}

Provide:
1. Discourse markers and connectives usage
2. Cohesion and coherence devices
3. Topic management and development
4. Reference and ellipsis patterns
5. Pragmatic features (politeness, indirectness, implicature)`
  },

  12: {
    system: `You are an expert computational linguist specializing in language complexity measurement.`,
    user: (transcript: string) => `Analyze this speaking transcript for Syntax & Complexity:

${transcript}

Provide:
1. Sentence length variation
2. Clause types and subordination
3. Syntactic complexity index
4. Passive vs active voice distribution
5. Coordination and subordination balance
6. Quantitative metrics`
  },

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

  14: {
    system: `You are an expert conversation analyst specializing in interactive competence.`,
    user: (transcript: string) => `Analyze this speaking transcript for Filler Analysis:

${transcript}

Provide:
1. Filler word distribution (um, uh, er, etc.)
2. False starts and self-repairs
3. Pause patterns (estimated from transcript)
4. Repetition types identified
5. Strategic vs problematic disfluencies
6. Already have fillers_per_minute metric — contextualize it`
  }
};

export function getModulePrompt(moduleId: number): { system: string; user: (transcript: string) => string } {
  const prompt = MODULE_PROMPTS[moduleId];
  if (!prompt) {
    throw new Error(`No prompt defined for module ID ${moduleId}`);
  }
  return prompt;
}
