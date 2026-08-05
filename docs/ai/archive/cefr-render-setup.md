# Render Setup: Add CEFR API to sottotitoli-websocket
# =====================================================
# Step-by-step. You've never done this before — follow exactly.

---

## PRE-STEP: What You Need

- Your computer (MacBook Air)
- The `sottotitoli-websocket` repo cloned locally (if not, clone it from GitHub)
- Access to dashboard.render.com (you're already logged in)
- About 15 minutes

---

## STEP 1: Download the Database File

Open Terminal. Run:

```bash
cd ~/Desktop
# If you don't have the websocket repo locally, clone it first:
# git clone https://github.com/buoninglese/sottotitoli-websocket.git
# cd sottotitoli-websocket

# Download the 20MB SQLite database
curl -L -o word_cefr_minified.db \
  https://github.com/Maximax67/Words-CEFR-Dataset/raw/main/word_cefr_minified.db

# Verify it downloaded correctly
ls -lh word_cefr_minified.db
# Should show: ~20MB
```

---

## STEP 2: Add the Database to Your Repo

```bash
# Navigate to your websocket repo
cd ~/Desktop/sottotitoli-websocket   # or wherever it lives

# Move the DB file there (if you downloaded it to Desktop)
mv ~/Desktop/word_cefr_minified.db .

# Make sure it's in the repo root (same folder as package.json)
ls
# You should see: package.json, server.js, word_cefr_minified.db, ...
```

---

## STEP 3: Install the SQLite Library

```bash
# In the websocket repo folder:
npm install better-sqlite3

# Verify it installed:
node -e "const Database = require('better-sqlite3'); console.log('OK');"
# Should print: OK
```

If you get an error about native modules, try:
```bash
npm rebuild better-sqlite3
```

---

## STEP 4: Add the API Routes File

Copy the file I already created for you:

```bash
# From the sottotitoli frontend repo:
cp /Users/sebastiankrauwel/sottotitoli/scripts/cefr-api.js \
   ~/Desktop/sottotitoli-websocket/routes/cefr.js
```

If the `routes/` folder doesn't exist yet:
```bash
mkdir -p ~/Desktop/sottotitoli-websocket/routes
cp /Users/sebastiankrauwel/sottotitoli/scripts/cefr-api.js \
   ~/Desktop/sottotitoli-websocket/routes/cefr.js
```

---

## STEP 5: Wire the Routes Into Your Server

Edit your main server file (probably `server.js` or `index.js`). 
Find the line where Express is set up (something like `const app = express();`).
Add these two lines AFTER the existing route imports but BEFORE `app.listen()`:

```javascript
// Add this near your other route imports:
import cefrRouter from './routes/cefr.js';

// Add this near your other app.use() lines:
app.use('/api/cefr', cefrRouter);
```

Your server.js probably looks something like:
```javascript
import express from 'express';
import { WebSocketServer } from 'ws';
// ... other imports ...

const app = express();
app.use(express.json());

// EXISTING ROUTES
app.get('/health', (req, res) => res.json({ status: 'ok' }));
// ... other routes ...

// ADD THESE TWO LINES:
import cefrRouter from './routes/cefr.js';   // <-- ADD
app.use('/api/cefr', cefrRouter);             // <-- ADD

// ... WebSocket setup ...

const port = process.env.PORT || 10000;
app.listen(port, () => console.log(`Listening on ${port}`));
```

---

## STEP 6: Add the DB File to .gitignore? (DECISION)

The DB is 20MB. GitHub's max file size is 100MB, so it CAN be committed.
But it'll make your repo bigger. Choose:

**Option A (recommended): Commit it.**
```bash
git add word_cefr_minified.db routes/cefr.js package.json package-lock.json
git commit -m "Add CEFR vocabulary database and API routes"
git push
```
Render will see the file on deploy and use it. Simple.

**Option B: Gitignore it + manual upload.**
```bash
echo "word_cefr_minified.db" >> .gitignore
# Then on Render dashboard, go to your service → Settings → 
# "Disk" → add a persistent disk. Upload the file there.
# This is more complex. Just use Option A.
```

---

## STEP 7: Deploy to Render

**If Render auto-deploys on push:** Just push. Done.

**If you need to trigger manually:**
1. Go to https://dashboard.render.com
2. Click your `sottotitoli-websocket` service
3. Click "Manual Deploy" → "Deploy latest commit"
4. Wait ~2-3 minutes for the build

---

## STEP 8: Verify It Works

After deploy completes, test the endpoints:

```bash
# Test 1: Single word lookup
curl https://sottotitoli-websocket.onrender.com/api/cefr/word?w=happy

# Expected output (approximate):
# {"found":true,"word":"happy","results":[{"pos":"JJ","posDescription":"Adjective","level":2.5,...}]}

# Test 2: Batch lookup
curl -X POST https://sottotitoli-websocket.onrender.com/api/cefr/batch \
  -H "Content-Type: application/json" \
  -d '{"words":["apple","happy","thrives","computer"]}'

# Test 3: Categories
curl https://sottotitoli-websocket.onrender.com/api/cefr/categories

# Test 4: Full text analysis
curl -X POST https://sottotitoli-websocket.onrender.com/api/cefr/analyze \
  -H "Content-Type: application/json" \
  -d '{"text":"The weather today is very nice. I went to the park."}'
```

All four should return JSON. If any returns an error, check the Render logs
(dashboard → your service → Logs tab).

---

## STEP 9: Add Config to Frontend

In your frontend repo (`sottotitoli`), add to `config.example.js`:

```javascript
// In window.SOTTOTITOLI_CONFIG:
cefrApiUrl: "https://sottotitoli-websocket.onrender.com/api/cefr",
```

And in `config.js` (the real one, gitignored):
```javascript
cefrApiUrl: "https://sottotitoli-websocket.onrender.com/api/cefr",
```

---

## TROUBLESHOOTING

| Problem | Solution |
|---------|----------|
| "Cannot find module better-sqlite3" | Run `npm install better-sqlite3` in the repo |
| "Database not available" in API response | The DB file isn't in the repo root. Check `ls -la *.db` |
| 503 error on all endpoints | The server started but DB didn't open. Check Render logs |
| Render build fails | Check if native modules need rebuild: add `npm rebuild` to build command |
| "ECONNREFUSED" when curling | The service might be sleeping (free tier). Wait 30s and retry |
| 404 on /api/cefr/* | The routes weren't wired in server.js. Check Step 5 |


## FILES YOU NOW HAVE

In the websocket repo:
```
sottotitoli-websocket/
├── server.js              (or index.js — your main server file)
├── package.json            (updated with better-sqlite3 dependency)
├── package-lock.json
├── word_cefr_minified.db   (NEW — 20MB vocabulary database)
└── routes/
    └── cefr.js             (NEW — 6 API endpoints)
```

In the frontend repo:
```
sottotitoli/
├── js/
│   └── cefr-gse.js         (NEW — pure JS scoring engine)
├── scripts/
│   └── cefr-api.js         (reference copy of the Render routes)
├── docs/
│   ├── cefr-roadmap-panoramica.md   (NEW — agent instructions)
│   └── cefr-roadmap-caption-s8t.md  (NEW — agent instructions)
└── config.example.js       (updated with cefrApiUrl)
```

---

## NEXT: After Render is working, give the two roadmap files
## (docs/cefr-roadmap-panoramica.md and docs/cefr-roadmap-caption-s8t.md)
## to your dedicated agents for the page implementations.
