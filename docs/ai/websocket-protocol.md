# websocket-protocol.md — WebSocket Relay Protocol

> **The immutable contract between the frontend and the WebSocket relay server.**
> Changing ANY of these formats will break real-time captions across all clients.
>
> **Cross-refs:** `architecture.md` · `docs/DECISIONS.md` (ADR-006) · `AGENTS.md` (Never list #4) · `config.example.js`

---

## Architecture

```
Browser Mic ──WebSocket──▶ Render Relay ──HTTP──▶ OpenAI Whisper
                                      │
                                      ▼
                          Broadcast to all clients in room
```

- **Relay server:** `sottotitoli-websocket` (Node.js ESM, hosted on Render)
- **WebSocket URL:** `wss://sottotitoli-websocket.onrender.com` (configured in `config.js`)
- **STT backend:** OpenAI Whisper via the relay

---

## Message Format (IMMUTABLE)

### Client → Server: Audio Data

The browser sends raw audio buffers over the WebSocket. No JSON envelope — binary data only.

```
[Binary audio buffer]
```

### Server → Client: Caption Results

Every caption result is a JSON message with this structure:

```json
{
  "msg": true,
  "final": "recognized text here",
  "id": 42,
  "label": "English"
}
```

```json
{
  "msg": true,
  "interm": "partial text..."
}
```

### Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `msg` | `boolean` | Always `true` | Identifies this as a caption message (distinguishes from control messages) |
| `final` | `string` | For final results | The completed, stable transcription text |
| `interm` | `string` | For interim results | Partial/in-progress transcription (may change) |
| `id` | `number` | For final results | Monotonically increasing message counter |
| `label` | `string` | For final results | Language label (e.g., `"English"`, `"Italiano"`) |

### Message Types

| Type | Has `final` | Has `interm` | Has `id` | Has `label` | Meaning |
|------|------------|-------------|---------|-------------|---------|
| **Final** | ✅ | ❌ | ✅ | ✅ | Stable transcription — display permanently |
| **Interim** | ❌ | ✅ | ❌ | ❌ | In-progress — display temporarily, replace on next message |

### Example Session

```
Server → Client: {"msg":true,"interm":"I think that"}
Server → Client: {"msg":true,"interm":"I think that we should"}
Server → Client: {"msg":true,"final":"I think that we should go","id":1,"label":"English"}
Server → Client: {"msg":true,"interm":"to the"}
Server → Client: {"msg":true,"final":"to the store","id":2,"label":"English"}
```

---

## Room Lifecycle

### Room Creation

Rooms are identified by a random string (e.g., `"room-a3f9b2c1"`). Generated client-side via `SottotitoliSessionUtils.randomRoom()`.

```
1. Client generates room ID: SottotitoliSessionUtils.randomRoom()
2. Client connects: ws://relay/?room=room-a3f9b2c1
3. Relay creates room if it doesn't exist
4. All clients connecting with the same room ID receive the same captions
```

### Room Persistence

- Rooms exist only while the WebSocket relay is running
- No database persistence — rooms are in-memory on the Render instance
- Render free tier: instances sleep after 15 minutes of inactivity
- On wake: new WebSocket connections create fresh rooms

### Reconnection

```
1. Client detects WebSocket close (network drop, Render sleep)
2. Waits 2s, reconnects with same room ID
3. Relay creates a NEW room (old room data is lost on sleep)
4. Session data in Supabase is preserved independently
```

---

## Session Flow

```
┌─ caption-s8t.html ─────────────────────────────────────┐
│                                                         │
│  1. User clicks "Avvia sessione"                        │
│  2. config.js loads → websocketUrl                      │
│  3. SessionUtils.randomRoom() → room ID                 │
│  4. New WebSocket(websocketUrl + "?room=" + roomId)     │
│  5. getUserMedia() → microphone stream                  │
│  6. AudioWorklet processes raw PCM → WebSocket.send()   │
│  7. onmessage → parse {final, interm, id, label}        │
│  8. Render captions in #captionBar                      │
│  9. User clicks "Stop" → WebSocket.close()              │
│ 10. Session saved → Supabase sessions table             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Multi-Client Rooms (DUO+ Mode)

```
Client A ──WebSocket──┐
                      ├── Relay ──▶ OpenAI Whisper
Client B ──WebSocket──┘        │
                      ┌────────┘
                      ▼
              Broadcast to A + B
```

In DUO+ mode (`duo-s8t.html`), multiple clients connect to the same room. All receive the same captions simultaneously. Each client can have a different translation language configured.

---

## Translation Integration

Translation happens **client-side** after receiving captions:

```
1. WebSocket message received: {final: "Hello world", ...}
2. Client calls translation provider (MyMemory → Google Translate fallback)
3. Translated text rendered alongside original
```

The relay does NOT perform translation — it only handles speech-to-text.

---

## CSP Configuration

The Content Security Policy must allow WebSocket connections:

```html
<meta http-equiv="Content-Security-Policy" content="
  connect-src 'self'
    https://qzqmuegbpmvqrjrlfbgk.supabase.co
    wss://sottotitoli-websocket.onrender.com
    https://sottotitoli-websocket.onrender.com
    ...
">
```

---

## Debugging

### Check WebSocket connection

```javascript
// In browser console on caption-s8t.html
const ws = window._activeSocket; // if exposed
console.log('ReadyState:', ws?.readyState); // 1 = OPEN, 3 = CLOSED
```

### ReadyState reference

| Value | Constant | Meaning |
|-------|----------|---------|
| 0 | `CONNECTING` | Socket connecting |
| 1 | `OPEN` | Connected, ready to send |
| 2 | `CLOSING` | Connection closing |
| 3 | `CLOSED` | Connection closed |

### Common failure modes

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| No captions, no errors | Render instance asleep | Wait 30s for cold start, refresh |
| `WebSocket is closed` | Network drop | Auto-reconnect after 2s |
| CSP blocks connection | `wss://` not in CSP | Add to `connect-src` in HTML `<meta>` |
| Room empty on reconnect | Render instance restarted | Generate new room ID |

---

## Migration Notes

If the message format ever needs to change:

1. **Add a version field:** `{"msg":true, "v":2, "final":"text", ...}`
2. **Support old format on the relay:** Parse both `v:1` and `v:2` messages
3. **Update client gradually:** Deploy new client that sends `v:2`
4. **Never remove old format support** until all clients are migrated

The relay is a separate repo (`sottotitoli-websocket`). Coordinate changes across both repos.

---

*This file is part of the AI agent documentation system. See `docs/ai/README.md` for the full index.*
