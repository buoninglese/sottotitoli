# Sottotitoli · Traduzione – Collaborative Release Runbook

**Goal:** Verify Supabase + GitHub Pages deployment and pass 15 multi-user tests to approve production release.

**Date:** 14 luglio 2026  
**Commit:** `940f998`  
**Status SQL:** ✅ A1–A3 eseguite  
**Status agent tests:** ✅ B1–B7 (6/7 passed, B6 skipped)

---

## Phase 1 – Environment verification (A4–A6)

Run these **before** any browser tests.

### A4 – Secrets

```bash
npx supabase secrets list
```

Confirm:
- `GOOGLE_TRANSLATE_API_KEY` is present
- `PUBLIC_APP_URL` is present and equals `https://buoninglese.github.io/sottotitoli/traduzione-s8t.html`

### A5 – Functions

```bash
npx supabase functions list
```

Confirm these are deployed:
- `create-room`
- `create-invite`
- `join-room`
- `translate-segment`

### A6 – Realtime / Replication

In Supabase Dashboard:
- Database → Realtime / Replication
- Ensure `transcript_segments` and `segment_translations` are enabled for Realtime events (INSERT/UPDATE)

**If any check fails, fix it first; do NOT proceed to browser tests.**

---

## Phase 2 – Two-browser collaborative tests

Use two authenticated browsers (e.g. `studiobuoninglese@gmail.com` and `joliechanel84@gmail.com`).

### 1. Room + invite basics
1. Host creates a room; copies invite link
2. Guest opens link; joins room

Verify:
- URL base matches `PUBLIC_APP_URL` and has only `?invite=<token>`
- Host and Guest see the same room ID and title

### 2. New invite behavior
1. Host clicks **"🔄 Nuovo invito"**; copies new link
2. Guest joins via new link

Verify:
- New link joins successfully
- Old link behaves according to chosen semantics (still valid or revoked) and is documented

### 3. Max-uses concurrency
1. Create invite with `maxUses = 1`
2. Two guests attempt to join simultaneously

Verify:
- Exactly one join succeeds
- The other sees a clean "invito non valido/esaurito" error
- `room_invites.uses` does not exceed `max_uses`

### 4. Host → Guest realtime
1. Host sends a message ("Test Host 1")

Verify:
- Guest sees it quickly, with correct speaker name
- Exactly one transcript row appears per message

### 5. Guest → Host realtime
1. Guest sends a message ("Test Guest 1")

Verify:
- Host sees it similarly
- No duplicates

### 6. 20-message concurrency
1. Host sends 10 messages quickly
2. Guest sends 10 messages quickly

Verify (on both browsers):
- 20 rows appear
- Order is consistent with server `sequence`
- No missing or duplicated rows

### 7. RPC + Realtime dedup
Watch devtools/network:
- For one message, observe `create_final_segment` RPC and Realtime INSERT
- Confirm DOM shows only **one** row per `clientSegmentId`

### 8. Different target languages
1. Host sets target language to Italian
2. Guest sets target language to French
3. Host sends an English message ("Hello world")

Verify:
- Host sees Italian translation
- Guest sees French translation
- DB has two `segment_translations` rows (one `it`, one `fr`)

### 9. Change TTL and resubscribe
1. Host changes TTL from Italian → French
2. Host reloads translations via UI

Verify:
- Existing rows reload in French where available
- New translations and Realtime updates use French

### 10. Successful server translation
With valid `GOOGLE_TRANSLATE_API_KEY`:
- Send a message and wait for translation

Verify:
- `segment_translations.status = 'complete'`
- Provider tag indicates Google Cloud
- Both browsers show translation

### 11. Failed translation + retry
In a controlled environment (e.g. temporarily break provider):
- Trigger a translation failure

Verify:
- UI shows a "🔄 Riprova" button (not infinite "…") for that segment
- Clicking retry either keeps a clean failure or, once provider is restored, succeeds and updates both browsers

### 12. Segment persistence failure + retry send
In a test environment:
- Temporarily break `create_final_segment`
- Send a message in collaborative mode

Verify:
- Row shows "⚠️ Invio non riuscito" (or equivalent)
- No new `transcript_segments` row exists

Then restore `create_final_segment`:
- Use UI retry-send action
- Confirm one segment is created and displayed, with same `clientSegmentId` and no duplicates

### 13. Member identity + RLS
- Confirm different users have distinct `room_members.id`
- Two users with the same display name still produce distinct `speakerMemberId` in segments
- Unauthenticated or non-member calls to RPCs/functions (final segment, feed item, translate, invite create) return 401/403 and no data

### 14. Atomic invite join details
Inspect Supabase logs/DB:
- `join_room_with_invite` increments `uses` atomically
- No invites show `uses > max_uses`
- `expires_at` and `revoked_at` prevent joining appropriately

### 15. Local/demo isolation
In an anonymous browser:
- Use local/demo mode (no invite, no auth)

Verify:
- No Supabase Realtime subscription
- No collaborative WebSocket channel
- Local transcript and translations are purely client-side

---

## Go/No-Go decision

- **Go:** All environment checks (A4–A6) succeed and all 15 tests pass exactly as described
- **No-Go:** Any failure above → fix, redeploy, and re-run affected tests before approving release

---

## Quick commands

```bash
# Secrets
npx supabase secrets list

# Functions
npx supabase functions list

# Deploy all functions
for fn in create-room create-invite join-room translate-segment; do
  npx supabase functions deploy $fn --no-verify-jwt
done

# Git
git status --short && git log -1 --oneline

# Open demo page
open https://buoninglese.github.io/sottotitoli/traduzione-s8t.html?demo
```
