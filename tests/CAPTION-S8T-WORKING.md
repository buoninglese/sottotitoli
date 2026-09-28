# How `caption-s8t.html` actually works — and the harness that proves it

**Status:** verified 2026-09-28 against frontend HEAD `bb34632` + one fix.
**Harness:** `tests/caption-harness.html` — **63 checks, 0 failures**, known-positive control firing,
1 documented finding.
**Run it:**
```bash
cd /Users/sebastiankrauwel/sottotitoli
python3 -m http.server 8149          # any free port; the repo root must be the doc root
open http://localhost:8149/tests/caption-harness.html
```
Read the summary line, or from a script read `window.__captionHarness`.

---

## 1. Why this page can be tested at all

The page is ~9,360 lines with 6 inline blocks, and it looks untestable: starting a session needs a
microphone, a permission prompt, a speech engine and a Supabase session. It is testable anyway,
because of four properties of the code — none of which the harness added:

| Seam | Location | Property that makes it injectable |
|---|---|---|
| Speech engine | `js/real-mic.js:133` | `window.SpeechRecognition \|\| window.webkitSpeechRecognition` is read **at call time**, not at load |
| Microphone | `js/real-mic.js:77` | every capture routes through `MicCore.gumWithTimeout` |
| Session control | `caption-s8t.html:4650` | `toggleSession()` is a top-level function, so the parent frame can drive it |
| Caption output | `js/real-mic.js:162` | text is handed to the page via `_realMic.onInterim` / `_realMic.onFinal` |

That last one is what makes real coverage possible: a fake engine's `onresult` drives the **actual**
caption pipeline — `onFinal` → transcript DOM → `window._sessionLines` → stats — with no human
speaking. **Nothing in the page is modified by the harness**; every seam is injected from the parent.

---

## 2. Subsystem map (what actually runs, in order)

1. **Start** — `#startBtn` calls the `s8tStart` shim (`:1534`), which delegates to `toggleSession`
   once the inline block has run. The shim exists because clicking Start before ~20 external scripts
   loaded used to throw `Uncaught ReferenceError: toggleSession is not defined` and do nothing.
2. **Source choice** — `window.S8tSource` (`:4841`) reads `sottotitoli-caption-source`. `'system'` is
   parked: `get()` coerces it back to `'mic'` **and rewrites storage**, so nobody is stranded.
3. **Capture** — `useSystem` → `S8tSystemAudio.start()` (unreachable while parked); else
   `RecordFallback.isNeeded()` → recorder segment path; else `startRealMic()` → the engine.
4. **Failure** — `startRealMic` sets `_realMic.lastError` and state `blocked` (permission/busy/no
   device) or `error` (timeout). `toggleSession` turns that into a message.
5. **Credit gate** — `_checkCreditsBeforeStart()` (`:5242`) reads `window.sottotitoliSupabase`, and on
   refusal calls `stopRealMic()`, clears `sessionActive`, and arms `window._creditBudgetSeconds`.
6. **Captions** — `_realMic.onInterim` fills `#captionInterim`; `_realMic.onFinal` appends a
   `div.line` to `#captionTranscript` and pushes `{en, ts}` to `window._sessionLines`.
7. **Stop** — clears the timer, detaches `stopBtn.onclick`, resets the body class, and **keeps** the
   transcript so the user can scroll back.
8. **Save** — builds `{lines, durationSeconds, fillerCount, sentenceMetrics, connectors}` and hands it
   to `_endSupabaseSession`, then awards XP and resets `_sessionLines`.

---

## 3. Evidence table

Every claim below is a row in `window.__captionHarness.results`. A claim with no row would be
unverified; there are none in this table.

### Boot and invariants — `S0`, `M1`–`M6`, `S1`–`S5`, `P1`–`P4`

| Claim | Row |
|---|---|
| The page under test is the code **on disk** (no stale modules) | `S0` — 19 modules, 0 stale |
| `mic-core.js`, `real-mic.js`, `record-fallback.js`, `system-audio.js`, `translation-providers.js`, `toast.js` all loaded | `M1`–`M6` |
| `mic-core.js` loads before `real-mic.js` | `S2` |
| Every direct `getUserMedia` in the page is **bounded** by a timeout race | `S3` — 1 found, 0 unbounded |
| The retired `X-Audio-Seconds` header is gone | `S4` |
| Computer audio is still deliberately parked | `S5`, `P1`, `P2` |
| A stored `'system'` is coerced to `'mic'` **and** storage rewritten | `P3` |
| Picker shows the chevron (mic), not headphones | `P4` |

### Credit gate — `CR1`–`CR5`

| Claim | Row |
|---|---|
| No client → fail-safe allow, budget unknown | `CR1` |
| Balance 12.5 min → allow, budget = **750 s** | `CR2` |
| Balance 0 → refuse, budget armed at **0** (not null) | `CR3` |
| A Supabase failure → allow (a query error must not lock users out) | `CR4` |
| No credit row → allow after the `initUserCredits` backstop | `CR5` |

### A normal session — `G1`–`G13`, `E0`–`E6`

| Claim | Row |
|---|---|
| Start reaches a live capture; page marks itself `session-active` | `G1`, `G2` |
| Exactly one engine created, `start()` called, `continuous`+`interim` on, page language set | `G3`, `G6` |
| Start hidden; Stop visible **and** clickable | `G4`, `G5` |
| Interim fills the live box and adds **no** transcript line | `E1` |
| A final result appends exactly one line, buffers it, and clears the interim | `E2`, `E3`, `E4`, `E5` |
| Stats counter agrees with the real line count | `E6` |
| A dropped engine auto-restarts while live | `G7` |
| Stop: state cleared, handler detached, timer `00:00`, **transcript retained** | `G8`–`G11` |
| A late `onend` after Stop does **not** restart the mic; the track is released | `G12`, `G13` |

### Failure modes — `F1`–`F15`

| Claim | Row |
|---|---|
| `NotAllowedError` → `blocked`, name preserved, "consenti l'accesso", Start restored | `F1`–`F4` |
| `NotReadableError` → **busy-device** wording, not permission wording | `F5`–`F7` |
| Timeout → `TimeoutError`, explained, never called "unsupported", Start restored | `F8`, `F9` |
| `NotFoundError` → blocked, recoverable | `F10` |
| No speech engine → recorder fallback chosen, user told something, no phantom engine | `F11`–`F13` |
| No engine **and** no recorder → "not supported" (the genuinely unsupported branch) | `F14`, `F15` |
| Every failure path leaves Start **enabled and visible** | `F3`, `F7`, `F9`, `F10`, `F15` |

### Money path and surfaces — `X1`–`X4`, `T1`, `T2`

| Claim | Row |
|---|---|
| Balance 0 → session never goes live, Start restored, budget armed at 0 | `X1`, `X2` |
| **The capture is actually stopped** (track ended *and* engine stopped) — no hot mic | `X3` |
| The user is told why, in words | `X4` |
| Caption language is exposed to translation providers | `T1` |
| `v20q_retranslateLine` survives an out-of-range index without breaking the transcript | `T2` |

---

## 4. Defect found and fixed by this harness

**A microphone timeout told Chrome users to "use Chrome/Edge".**
`startRealMic` reports a timeout as state `error`, not `blocked`. The message chain in
`toggleSession` therefore fell through `_realMic.state === 'blocked'` into the catch-all
`else if (!useFallback)` branch and showed *"Live captions are not supported in this browser. Use
Chrome/Edge (desktop or Android)."* — on Chrome, to a user whose only problem was that the mic did
not answer within 12 s. It also overwrote the correct toast that `_notifyMicProblem('TimeoutError')`
had already shown.

Fixed in `caption-s8t.html` by handling the timeout before the catch-all, reusing the existing
`mic_gum_timeout` dictionary key. `F9` now asserts the **advice**, not merely that a message exists —
which is why it caught this: the first version of `F9` only checked "is something shown?" and passed
on the wrong message.

---

## 5. Documented findings (not fixed)

| # | Finding | Row |
|---|---|---|
| 1 | `window._duoWs.onerror = function () {}` (`:8442`) — a WebSocket error is swallowed: no log, no state change, no user feedback. | `W1` |
| 2 | Two mic messages are **hardcoded Italian** and are not routed through `S8T()`: the blocked-permission text (`F2`) and the busy-device text (`F6`). An English-UI user sees Italian for exactly these two. `F2`/`F6` pass with Italian text **on an English-UI page**, which is what proves the hardcoding. | `F2`, `F6` |
| 3 | `tests/mic-harness.html` loads `../js/*.js` **unpinned** and has no freshness guard, so it is exposed to the same stale-module problem that `S0` now protects this harness from. | `S0` (contrast) |

---

## 6. Two harness bugs this exercise exposed — both in the harness, not the page

**a) It could report green while measuring stale code.** Editing `rec.continuous` to `false` in
`js/real-mic.js` and re-running still reported `continuous=true`. Measured directly: a plain
`fetch('js/real-mic.js?v=30')` returned the old text while `{cache:'reload'}` returned the new text.
So the page was running a **cached older module** and every row was a measurement of the wrong build.
Fixed by `S0`: the harness refreshes every `js/`+`css/` the page loads **before** the iframe starts,
then asserts nothing is left stale. Proven both ways — `G6` correctly failed while the code was
broken, and passed once reverted.

**b) The page HTML itself was cached.** A fix to `caption-s8t.html`'s own inline block had **no
effect** until the iframe URL was cache-busted, because `refreshModules()` only covers sub-resources.
`IFRAME_SRC` now carries a per-run `cb=`. Without this, inline-block edits are silently untestable.

Both were caught only because the plan required proving **sensitivity** — that the harness goes red
when a real behaviour breaks. A harness that cannot fail proves nothing.

---

## 7. What this harness CANNOT measure

Stated explicitly so a green table is never read as more than it is:

- **A real microphone.** Every capture here is a fake. Permission prompts, device labels,
  Bluetooth headset switching and OS-level behaviour are untouched.
- **Real speech.** The engine is simulated. Real recognition accuracy, latency, and the browser's own
  `no-speech`/`aborted` cadence are not exercised.
- **Live credits and Supabase writes.** `_endSupabaseSession` is stubbed to *capture its argument*;
  the network write itself, RLS, and real balances are unverified.
- **Translation round-trip.** Only the contract and crash-safety are checked — no live provider call.
- **Duo WebSocket runtime.** Frame shapes are checked at source level only; two real peers are needed
  for the actual flow.
- **iOS.** `RecordFallback`'s real segment/Whisper path never runs.
- **The system-audio source**, which is parked at `FEATURE_ENABLED = false`.

Because of the above, the manual checklist for the real path is not optional.

---

## 8. Reproduce the sensitivity proof

To confirm the harness can still fail (do this after any change to it):

1. Edit `js/real-mic.js` line ~141: `rec.continuous = true;` → `false`.
2. Reload `tests/caption-harness.html`. **Expect `G6` to FAIL** with `continuous=false`.
3. Revert the line and reload. Expect 63/63.

If step 2 stays green, the freshness guard has regressed and no row can be trusted.
