# AI Report Processing Edge Function

## Overview
This Edge Function processes AI report requests by:
1. Fetching pending requests from `ai_report_requests`
2. Loading session transcripts and module details
3. Using module-specific prompts from `prompts.ts`
4. Calling OpenAI API (gpt-4) with sophisticated assessment prompts
5. Storing results in `session_ai_reports` with status tracking

## Deployment

### Prerequisites
- Supabase CLI installed: `npm install -g supabase`
- Logged in to Supabase: `supabase login`
- Project linked: `supabase link --project-ref qzqmuegbpmvqrjrlfbgk`

### Environment Variables (Already Set)
✅ `OPENAI_API_KEY` - Set in dashboard (21 May 2026)
✅ `SUPABASE_URL` - Auto-injected by Supabase
✅ `SUPABASE_SERVICE_ROLE_KEY` - Auto-injected (SUPABASE_SECRET_KEYS)

### Deploy Command
```bash
cd /path/to/sottotitoli
supabase functions deploy process-ai-reports --project-ref qzqmuegbpmvqrjrlfbgk
```

### Test Deployment
```bash
curl -L -X POST \
  'https://qzqmuegbpmvqrjrlfbgk.supabase.co/functions/v1/process-ai-reports' \
  -H 'Authorization: Bearer [YOUR_ANON_KEY]' \
  --data '{"test":true}'
```

## Module Prompts (14 Total)

### Cambridge Modules (IDs 3-9)
- **3**: Fluency & Coherence - Rate of speech, hesitations, logical organization
- **4**: Grammar & Accuracy - Grammatical structures, verb tenses, accuracy
- **5**: Pronunciation - Intelligibility, stress patterns, problem sounds
- **6**: Vocabulary Range - Lexical variety, collocations, topic-specific vocabulary
- **7**: Formal Register - Professional communication, business correspondence
- **8**: Presentation Skills - Clarity, audience engagement, structure
- **9**: Academic Register - Research presentations, academic discourse

### Business Modules (IDs 10-11)
- **10**: Critical Thinking - Argumentation, evidence evaluation
- **11**: Discourse Markers - Cohesive devices, logical connectors

### Academic Modules (IDs 12-13)
- **12**: Complexity Metrics - Lexical density, syntactic complexity
- **13**: Error Analysis - Systematic error patterns, fossilization

### Linguistic Analysis (IDs 14-16)
- **14**: Interaction Patterns - Turn-taking, backchanneling, collaboration
- **15**: Pragmatic Competence - Appropriateness, politeness, implicature
- **16**: Narrative Structure - Orientation, complication, resolution

## Architecture

### Data Flow
1. Frontend (`analysis.html`) → `requestReport(moduleId)` → inserts to `ai_report_requests` (status='pending')
2. Edge Function (scheduled/triggered) → fetches pending requests
3. For each request:
   - Load session transcript & module details
   - Get module-specific prompts via `getModulePrompt(moduleId, transcript)`
   - Call OpenAI API with system/user prompts
   - Insert result to `session_ai_reports` (status='done', summary_text, tokens_used)
   - Update request status to 'completed'
4. Frontend polls `session_ai_reports` → displays report when status='done'

### Database Schema

#### `ai_report_requests`
- `id` (uuid, PK)
- `session_id` (uuid, FK → sessions)
- `module_id` (int, FK → ai_report_modules)
- `status` (text: 'pending', 'processing', 'completed')
- `created_at` (timestamptz)

#### `session_ai_reports`
- `id` (uuid, PK)
- `session_id` (uuid, FK → sessions)
- `module_id` (int, FK → ai_report_modules)
- `summary_text` (text) - AI-generated assessment
- `tokens_used` (int) - OpenAI token consumption
- `raw_json` (jsonb) - Full OpenAI response
- `created_at` (timestamptz)

#### `ai_report_modules`
- `id` (int, PK)
- `module_key` (text, unique)
- `label` (jsonb) - Multi-language labels
- `category` (text: 'cambridge', 'business', 'academic', 'linguistic')

## Testing End-to-End

### 1. Create Test Request
```sql
-- In Supabase SQL Editor
INSERT INTO ai_report_requests (session_id, module_id, status)
SELECT id, 3, 'pending'
FROM sessions
WHERE transcript_text IS NOT NULL
LIMIT 1;
```

### 2. Trigger Edge Function
```bash
# Manual invocation
curl -L -X POST \
  'https://qzqmuegbpmvqrjrlfbgk.supabase.co/functions/v1/process-ai-reports' \
  -H 'Authorization: Bearer [YOUR_ANON_KEY]'
```

### 3. Check Results
```sql
-- Verify report was created
SELECT * FROM session_ai_reports ORDER BY created_at DESC LIMIT 1;

-- Check request status
SELECT * FROM ai_report_requests ORDER BY created_at DESC LIMIT 1;
```

### 4. Frontend Test
1. Navigate to `/analysis.html`
2. Select a session with transcript
3. Click "Genera report" on Fluency & Coherence module
4. Wait for polling to detect status='done'
5. Verify report displays
6. Click "Scarica report" to download

## Troubleshooting

### Issue: Function not processing requests
- Check Edge Function logs in Supabase dashboard
- Verify OPENAI_API_KEY is set correctly
- Ensure RLS policies allow service role to insert into `session_ai_reports`

### Issue: Frontend not showing reports
- Check browser console for errors
- Verify polling is running: `pollReportStatus()` every 3 seconds
- Confirm `session_ai_reports` has matching session_id and module_id
- Check RLS policy allows user to read their own reports

### Issue: OpenAI API errors
- Verify API key is valid and has credits
- Check token limits (currently set to max_tokens: 800)
- Review OpenAI API status

## Next Steps

1. **Deploy Function**: Run deployment command above
2. **Schedule Processing**: Set up cron job or database trigger to invoke function automatically
3. **Monitor Usage**: Track OpenAI token consumption and costs
4. **UI Polish**: Add Italian translations, loading states, error handling
5. **Token Display**: Show token usage in frontend for transparency
6. **Batch Processing**: Optimize for multiple concurrent requests
7. **Caching**: Consider caching reports to avoid re-generation

## File Structure
```
supabase/functions/process-ai-reports/
├── index.ts        # Main Edge Function handler
├── prompts.ts      # 14 module-specific prompt definitions
└── README.md       # This file
```

## Commit History
- feat(backend): add Supabase Edge Function for AI report processing
- feat(backend): create 14 module-specific prompts for AI analysis
- feat(backend): integrate module-specific prompts into Edge Function
