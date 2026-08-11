// js/panoramica/panels/ai-voice.js — pnl-ai-voice panel
var container = null;

export async function render(parentEl) {
  container = parentEl;
  container.innerHTML = `        <div class="content-panel" id="pnl-ai-voice">
          <section class="panel-head" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
            <h2>🎙️ AI Voice</h2><span class="premium-pill">PREMIUM</span>
            <div class="mode-toggle-voice" style="display:flex;gap:3px;background:var(--card2, #1a1f2e);border-radius:99px;padding:3px;border:1px solid var(--line);margin-left:4px">
              <button class="mode-btn-voice active" data-mode="browser" onclick="setVoiceMode('browser')" style="padding:5px 13px;border-radius:99px;border:none;background:transparent;color:var(--text-dim);font-family:var(--font-ui);font-size:11px;font-weight:600;cursor:pointer;transition:all .15s">⚡ Browser</button>
              <button class="mode-btn-voice" data-mode="kokoro" onclick="setVoiceMode('kokoro')" style="padding:5px 13px;border-radius:99px;border:none;background:transparent;color:var(--text-dim);font-family:var(--font-ui);font-size:11px;font-weight:600;cursor:pointer;transition:all .15s">🎙️ Kokoro</button>
            </div>
          </section>
          <p style="font-size:15px;color:var(--text-soft);margin:0 0 16px;max-width:680px;line-height:1.6" id="voiceModeDesc">Browser mode: parla nel browser — speech-to-text e text-to-speech sono istantanei. L'AI risponde via Cerebras.</p>

          <!-- Browser mode: inline voice UI -->
          <div id="voiceBrowserMode" style="background:var(--card);border:1px solid var(--line);border-radius:18px;overflow:hidden;box-shadow:var(--shadow-lg);min-height:500px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;padding:40px 20px">
            <div id="voiceConvBox" style="width:100%;max-width:520px;max-height:150px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;font-size:13px;padding:0 8px"></div>
            <div id="voiceOrb" onclick="toggleVoiceMic()" title="Clicca per parlare" style="width:110px;height:110px;border-radius:50%;border:3px solid var(--line);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .3s;background:var(--card);position:relative;user-select:none;flex-shrink:0">
              <span id="voiceOrbIcon" style="font-size:32px">🎙️</span>
              <span id="voiceOrbState" style="position:absolute;bottom:-24px;font-size:11px;color:var(--text-dim);white-space:nowrap">Clicca per parlare</span>
            </div>
            <div style="font-size:11px;color:var(--text-faint);text-align:center;line-height:1.6"><strong>Click</strong> l'orbe per parlare · <strong>Click</strong> di nuovo per fermare<br>Browser STT/TTS · AI: <strong>Gemma 4 31B</strong> @ Cerebras</div>
          </div>

          <!-- Kokoro mode: iframe -->
          <div id="voiceKokoroMode" style="display:none;background:var(--card);border:1px solid var(--line);border-radius:18px;overflow:hidden;box-shadow:var(--shadow-lg);">
            <iframe
              src="hugging-voice/index.html"
              style="display:block;width:100%;height:700px;border:none;"
              title="AI Voice Conversation"
              allow="microphone; autoplay"
              loading="lazy"
              id="voiceKokoroFrame"
            ></iframe>
          </div>

          <p style="font-size:12px;color:var(--text-faint);text-align:center;margin-top:8px">
            Powered by <a href="https://github.com/huggingface/speech-to-speech" target="_blank" rel="noopener" style="color:inherit">huggingface/speech-to-speech</a>
            &nbsp;·&nbsp; Server AI Voice: <span id="voiceServerUrl">—</span>
          </p>
        </div>
`;
}

export async function init() {}
export function destroy() { container = null; }
