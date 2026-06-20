# Developer Workflow — AI Reports & Prompts

This guide explains how to create, test, and deploy AI report prompts for Sottotitoli.

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  User buys report on analysis.html                          │
│  ↓                                                          │
│  ai_report_requests (Supabase table) — status: 'queued'     │
│  ↓                                                          │
│  process-ai-reports Edge Function (Deno, runs on schedule)  │
│  ↓                                                          │
│  Calls OpenAI GPT-4o with prompt from prompts.ts            │
│  ↓                                                          │
│  Writes result to session_ai_reports (Supabase table)       │
│  ↓                                                          │
│  User sees report on Account → Report salvati tab           │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Files You Need to Know

| File | Purpose | Edit? |
|------|---------|-------|
| `dev/prompts.html` | Visual prompt editor (local, browser) | ✅ Yes — tweak prompts here |
| `supabase/functions/process-ai-reports/index.ts` | Edge Function that processes reports | ⚠️ Only if changing logic |
| `supabase/functions/process-ai-reports/prompts.ts` | Prompt templates used by the Edge Function | ✅ Yes — deploy prompts here |
| `ai_report_modules.sql` | Module definitions (name, description, family) | ✅ Yes — register new modules |
| `supabase_setup.sql` | Full DB schema reference | 📖 Read-only |

---

## 3. Step-by-Step Workflow

### Step 1: Edit prompts locally

Open `dev/prompts.html` in your browser:
```
http://localhost:8000/dev/prompts.html
```

- Click a module in the left sidebar (e.g. "Grammar & Accuracy")
- Edit the **System Prompt** — this is what OpenAI receives
- Edit the **Output Schema** — this defines the JSON structure
- Change **Model** and **Temperature** if needed
- Click **💾 Salva** — saves to localStorage

### Step 2: Export your prompts

In the dev workspace, click **📥 Esporta tutto**. This downloads a JSON file like:
```
sottotitoli-prompts-2026-06-20.json
```

### Step 3: Copy prompts to the Edge Function

Open the file:
```
supabase/functions/process-ai-reports/prompts.ts
```

It looks like this:
```typescript
export const MODULE_PROMPTS: Record<string, {
  systemPrompt: string;
  outputSchema: object;
  model: string;
  temperature: number;
}> = {
  grammar: {
    systemPrompt: `You are an expert English language assessor...`,
    outputSchema: { overall_score: "number", ... },
    model: "gpt-4o",
    temperature: 0.7
  },
  vocabulary: { ... },
  // ... more modules
};
```

Replace the prompt text for the module you edited. Copy-paste from the exported JSON or from the dev workspace.

### Step 4: Deploy the Edge Function

```bash
cd /Users/sebastiankrauwel/sottotitoli
supabase functions deploy process-ai-reports
```

This uploads the updated prompts to Supabase. Takes ~30 seconds.

### Step 5: Test

1. Go to `http://localhost:8000/analysis.html`
2. Click a report card
3. Select a transcript
4. Click **Acquista report**
5. Wait for the Edge Function to process it (runs every ~30s)
6. Check `http://localhost:8000/account.html` → Report salvati tab

### Step 6: Check results in Supabase

Open Supabase Dashboard → Table Editor → `session_ai_reports`

Look at the most recent row. Check:
- `summary_text` — the AI summary
- `overall_score` — 0-100
- `strengths` — array
- `issues` — array
- `recommendations` — array

If `status` is `'failed'`, check `error_message`.

---

## 4. Prompt Template Variables

The Edge Function replaces these before sending to OpenAI:

| Variable | Description |
|----------|-------------|
| `{{TRANSCRIPT}}` | Full text of the selected session |
| `{{LANGUAGE}}` | Source language (e.g. "en", "it") |
| `{{CEFR_LEVEL}}` | User's self-reported CEFR level |
| `{{PREVIOUS_SESSIONS}}` | Summaries of last 3 sessions (for progress reports) |
| `{{USER_GOAL}}` | From questionnaire (conversation/business/academic/travel) |
| `{{USER_DIFFICULTY}}` | From questionnaire (grammar/speaking/listening/vocabulary) |

---

## 5. Adding a New Report Module

### 5.1 Register in database

Add to `ai_report_modules.sql`:
```sql
INSERT INTO ai_report_modules (name, description, family, prompt_template)
VALUES (
  'My New Report',
  'Description of what this report analyzes',
  'linguistic',  -- cambridge, business, academic, or linguistic
  'Prompt text here...'
);
```

Run it:
```bash
supabase db push
```

Or execute directly in Supabase SQL Editor.

### 5.2 Add prompt to Edge Function

In `supabase/functions/process-ai-reports/prompts.ts`, add:
```typescript
"my_new_report": {
  systemPrompt: `You are an expert...`,
  outputSchema: { ... },
  model: "gpt-4o",
  temperature: 0.7
}
```

### 5.3 Add to frontend marketplace

In `analysis.html`, add to the `REPORT_TYPES` array:
```javascript
{id:'my_new_report', icon:'🆕', name:'My New Report', desc:'...', price:3, color:'var(--accent)', badge:'new', badgeText:'Nuovo'}
```

### 5.4 Add to Account reports tab

The Account page auto-discovers reports from `session_ai_reports`, so new types appear automatically.

---

## 6. Debugging

### Report stuck on "In elaborazione"

Check if the Edge Function is running:
```bash
supabase functions list
```

Check logs:
```bash
supabase functions logs process-ai-reports
```

### Edge Function error

Common causes:
- `OPENAI_API_KEY` not set in Supabase secrets
- Prompt too long (transcript exceeds token limit)
- Output doesn't match schema → OpenAI returns malformed JSON

Fix: Reduce transcript length or simplify prompt.

### Token deduction but no report

The Edge Function processes requests in batches. It runs periodically (triggered by Supabase cron or manual invocation). If a request is stuck:
1. Check `ai_report_requests` table — status should be `processing` or `completed`
2. If stuck on `queued`, manually invoke the Edge Function:
   ```bash
   curl -X POST https://qzqmuegbpmvqrjrlfbgk.supabase.co/functions/v1/process-ai-reports \
     -H "Authorization: Bearer YOUR_ANON_KEY"
   ```

---

## 7. Quick Reference

```bash
# Edit prompts visually
open http://localhost:8000/dev/prompts.html

# Deploy edge function
supabase functions deploy process-ai-reports

# Check logs
supabase functions logs process-ai-reports

# Check database
# Supabase Dashboard → Table Editor → session_ai_reports
```

---

## 8. Report Types Reference

| ID | Name | Tokens | Family | Purpose |
|----|------|--------|--------|---------|
| grammar | Grammar & Accuracy | 2 | Cambridge | Error analysis, tense usage |
| vocabulary | Vocabulary Range | 2 | Linguistic | Word diversity, CEFR levels |
| fluency | Fluency & Coherence | 2 | Cambridge | Pacing, fillers, flow |
| cefr | CEFR Assessment | 2 | Linguistic | Level estimate A1-C2 |
| progress | Progress Report | 3 | Linguistic | Trend analysis vs history |
| style | Speaking Style | 2 | Linguistic | Formality, complexity |
| transfer | Italian-English Transfer | 3 | Linguistic | L1 interference patterns |
| business | Business English | 3 | Business | Professional readiness |
| exam | Exam Readiness | 4 | Academic | IELTS/TOEFL estimate |
| comprehensive | Comprehensive | 5 | Linguistic | All-in-one full analysis |
