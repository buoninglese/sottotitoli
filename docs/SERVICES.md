# Service URLs & Monitoring

## Production

| Service | URL |
|---------|-----|
| Frontend | https://buoninglese.github.io/sottotitoli |
| WebSocket Server | https://sottotitoli-websocket.onrender.com |
| Learning Service | https://sottotitoli-learning.onrender.com |
| Supabase Dashboard | https://supabase.com/dashboard/project/qzqmuegbpmvqrjrlfbgk |
| Supabase Edge Functions | https://qzqmuegbpmvqrjrlfbgk.supabase.co/functions/v1/ |

## Health Endpoints

| Service | Endpoint |
|---------|----------|
| WebSocket health | GET https://sottotitoli-websocket.onrender.com/health |
| Learning health | (none — check service logs) |

## Staging

(Add staging URLs here when created)

## Monitoring & Alerting

- Render dashboard shows logs and metrics for both backend services
- Supabase dashboard shows database size, auth activity, and function logs
- OpenAI usage can be monitored in the OpenAI dashboard
- Oxford API usage is tracked in the Oxford Dictionaries dashboard
