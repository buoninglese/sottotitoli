# ai-s8t.html — Complete Architecture Report

> **File:** 18 lines. Minimal fullscreen iframe shell for the AI Voice experience.
> **Last updated:** 2026-08-05 (v166)

> **Dev tools available:** Error Lens (inline errors), ESLint (.js linting), HTMLHint (HTML validation), `Cmd+Shift+M` Problems panel, `node --check <file.js>`. See AGENTS.md § Developer Tools.

> **Dev tools available:** Error Lens (inline errors), ESLint (.js linting), HTMLHint (HTML validation), `Cmd+Shift+M` Problems panel, `node --check <file.js>`. See AGENTS.md § Developer Tools.

---

## 1. Purpose

A **fullscreen iframe shell** that loads the AI Voice interface from `hugging-voice/index.html`. It exists as a standalone page so users can open the AI voice experience in its own tab/window without the Hugging Face Space UI chrome.

---

## 2. Full Source

```html
<!DOCTYPE html>
<html lang="it" data-theme="dark" translate="no" class="notranslate">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="google" content="notranslate">
  <title>AI Voice · Sottotitoli</title>
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0a0b10; overflow: hidden; }
    iframe { width: 100vw; height: 100vh; border: none; display: block; }
  </style>
</head>
<body>
  <iframe src="hugging-voice/index.html?v=6573345" title="AI Voice" allow="microphone; autoplay"></iframe>
</body>
</html>
```

---

## 3. Hooked-Up Systems

| Component | Details |
|-----------|---------|
| **iframe target** | `hugging-voice/index.html?v=6573345` — the Hugging Face-ported voice interface |
| **Cache busting** | `?v=6573345` query string prevents stale cached versions |
| **Permissions** | `allow="microphone; autoplay"` — needed for speech input/output |
| **Theme** | `data-theme="dark"` on `<html>` — matches the voice interface's dark background |
| **Google Translate** | `<meta name="google" content="notranslate">` + `translate="no"` + `class="notranslate"` — blocks browser auto-translation |
| **Background** | `#0a0b10` — near-black, matches the iframe content's background for seamless look |
| **Overflow** | `overflow: hidden` — no scrollbars, pure fullscreen experience |

---

## 4. Relationship to Hugging Voice Backend

```
ai-s8t.html (18 lines, static shell)
  │
  │ <iframe src="hugging-voice/index.html?v=6573345">
  ▼
hugging-voice/index.html
  ├── hugging-voice/main.js     (WebSocket, audio, TTS, UI)
  ├── hugging-voice/style.css   (embed mode CSS)
  ├── hugging-voice/server.py   (Python backend: STT + TTS)
  ├── hugging-voice/worklets/   (Audio processing)
  └── hugging-voice/ui/         (UI components)
```

---

## 5. Comparison with Other Pages

| Page | Lines | Complexity | Role |
|------|-------|------------|------|
| `caption-s8t.html` | 8,928 | Maximum | Full caption/translate/analysis cockpit |
| `duo-s8t.html` | 978 | Medium | Multi-speaker translation receiver |
| `ai-s8t.html` | 18 | Minimal | Fullscreen iframe to AI voice experience |

`ai-s8t.html` is deliberately empty — all the logic lives in `hugging-voice/`. The page exists only to:
1. Provide a clean, standalone URL (`/ai-s8t.html`)
2. Bypass any Hugging Face Space UI chrome
3. Match Sottotitoli's dark theme
4. Grant microphone + autoplay permissions at the top-level document
5. Block Google Translate from mangling the UI

---

## 6. How These Three Pages Relate

```
caption-s8t.html (DUO+ mode, host)
  │ WebSocket: {msg:true, final:"text", label:"A"}
  ▼
sottotitoli-websocket (Render relay)
  │ Broadcasts to all clients in room
  ▼
duo-s8t.html (guest or viewer)
  │ Receives captions → translates → displays
  │
  └── User opens ai-s8t.html in separate tab for AI voice interaction
        └── hugging-voice/index.html (full AI voice pipeline)
```

`duo-s8t.html` is the **passive viewer** — it listens and translates. `ai-s8t.html` is a **completely separate experience** — a real-time speech-to-speech AI voice conversation. They don't directly communicate; they serve different use cases within the same project.
