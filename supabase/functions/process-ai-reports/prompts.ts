// AI Analysis Module Prompts
// Maps module IDs to specialized assessment prompts

export const MODULE_PROMPTS: Record<number, { system: string; user: (transcript: string) => string }> = {
  // === CAMBRIDGE MODULES ===
  
  // 1. Fluency & Coherence
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

  // 2. Grammar & Accuracy
  4: {
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

  // 3. Pronunciation
  5: {
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

  // 4. Vocabulary Range
  6: {
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

  // === BUSINESS MODULES ===

  // 5. Formal Register
  7: {
    system: `You are an expert business English assessor specializing in formal register and professional communication.`,
    user: (transcript: string) => `Analyze this speaking transcript for Business Formal Register:

${transcript}

Provide:
1. Register Appropriateness (formal vs informal language)
2. Professional Tone Assessment
3. Business Vocabulary usage
4. Examples of formal/informal language
5. Recommendations for professional contexts
6. Suitability for business settings`
  },

  // 6. Presentation Skills
  8: {
    system: `You are an expert business communication coach specializing in presentation skills assessment.`,
    user: (transcript: string) => `Analyze this speaking transcript for Presentation Skills:

${transcript}

Provide:
1. Structure & Organization (intro, body, conclusion)
2. Signposting language used
3. Engagement techniques
4. Clarity of main points
5. Persuasiveness
6. Recommendations for business presentations`
  },

  // === ACADEMIC MODULES ===

  // 7. Academic Register
  9: {
    system: `You are an expert academic English assessor specializing in academic discourse analysis.`,
    user: (transcript: string) => `Analyze this speaking transcript for Academic Register:

${transcript}

Provide:
1. Academic Vocabulary usage
2. Hedging and cautious language
3. Citation and referencing language
4. Objectivity vs subjectivity
5. Complexity of argumentation
6. Suitability for academic contexts`
  },

  // 8. Critical Thinking
  10: {
    system: `You are an expert academic skills assessor specializing in critical thinking evaluation.`,
    user: (transcript: string) => `Analyze this speaking transcript for Critical Thinking:

${transcript}

Provide:
1. Depth of Analysis
2. Evidence of reasoning (cause-effect, comparison)
3. Evaluation of ideas
4. Perspective-taking
5. Argument structure
6. Recommendations for academic development`
  },

  // === LINGUISTIC ANALYSIS MODULES ===

  // 9. Discourse Markers
  11: {
    system: `You are an expert linguist specializing in discourse analysis and cohesion.`,
    user: (transcript: string) => `Analyze this speaking transcript for Discourse Markers:

${transcript}

Provide:
1. Frequency and variety of discourse markers
2. Appropriate usage (additive, contrastive, sequential)
3. Overused markers
4. Missing marker types
5. Impact on coherence
6. Recommendations for balanced usage`
  },

  // 10. Complexity Metrics
  12: {
    system: `You are an expert computational linguist specializing in language complexity measurement.`,
    user: (transcript: string) => `Analyze this speaking transcript for Linguistic Complexity:

${transcript}

Provide:
1. Sentence length averages
2. Subordination frequency
3. Clause complexity
4. Syntactic variety
5. Lexical density estimate
6. Comparison to CEFR benchmarks`
  },

  // 11. Error Analysis
  13: {
    system: `You are an expert error analysis specialist in second language acquisition.`,
    user: (transcript: string) => `Perform comprehensive Error Analysis on this transcript:

${transcript}

Provide:
1. Error Categories (grammar, lexical, discourse)
2. Error Frequency by type
3. Developmental vs Fossilized errors
4. Interlanguage patterns
5. Prioritized correction areas
6. Learning implications`
  },

  // 12. Interaction Patterns
  14: {
    system: `You are an expert conversation analyst specializing in interactive competence.`,
    user: (transcript: string) => `Analyze this speaking transcript for Interaction Patterns:

${transcript}

Provide:
1. Turn-taking ability
2. Topic development and maintenance
3. Repair strategies
4. Backchanneling
5. Collaborative communication
6. Conversational competence level`
  },

  // 13. Pragmatic Competence
  15: {
    system: `You are an expert pragmatics specialist analyzing communicative effectiveness.`,
    user: (transcript: string) => `Analyze this speaking transcript for Pragmatic Competence:

${transcript}

Provide:
1. Speech act realization (requests, apologies, etc.)
2. Politeness strategies
3. Appropriateness to context
4. Implicature and inference
5. Sociolinguistic awareness
6. Communicative effectiveness`
  },

  // 14. Narrative Structure
  16: {
    system: `You are an expert narrative analysis specialist in discourse studies.`,
    user: (transcript: string) => `Analyze this speaking transcript for Narrative Structure:

${transcript}

Provide:
1. Narrative organization (orientation, complication, resolution)
2. Temporal sequencing
3. Character and setting development
4. Evaluation and reflection
5. Narrative coherence
6. Storytelling effectiveness`
  }
};

// Helper function to get prompt for a module
export function getModulePrompt(moduleId: number, transcript: string) {
  const prompt = MODULE_PROMPTS[moduleId];
  if (!prompt) {
    throw new Error(`No prompt found for module ID: ${moduleId}`);
  }
  return {
    system: prompt.system,
    user: prompt.user(transcript)
  };
}
