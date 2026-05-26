# Privacy Notes

## Data Processed

| Data Type | Where | Purpose |
|-----------|-------|---------|
| Transcript text | Supabase (sessions table) | Stored for analysis, reports, and review |
| Audio recordings | Uploaded to websocket → OpenAI Whisper | Transient — processed in memory, not stored |
| Google account info | Supabase Auth | Authentication only |
| Oxford word lookups | Learning service → Oxford API | Dictionary enrichment — not stored |
| AI report results | Supabase (session_ai_reports table) | Generated reports stored for user review |

## Data Retention

- **Transcripts**: Stored until user deletes their session
- **Audio**: Not stored — processed in memory only
- **AI reports**: Stored until user deletes their session
- **Account data**: Managed via Supabase Auth; user can delete account on request
- **Oxford lookups**: Not stored server-side

## Data Sharing

- Transcript text is sent to MyMemory API (for translation) and OpenAI API (for AI reports)
- No personal data is sold or shared with third parties beyond the APIs listed above
- All third-party API calls are subject to those providers' privacy policies

## User Rights

- Users can delete sessions and reports from the analysis page
- Account deletion can be requested via the account page
- Contact the repository maintainer for data removal requests
