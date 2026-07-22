#!/usr/bin/env python3
"""Generate Kokoro voice preview WAVs — two standard phrases per voice."""
import os, sys, json, wave
import numpy as np

PREVIEW_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'tmp', 'voice-previews')
os.makedirs(PREVIEW_DIR, exist_ok=True)

PHRASES = {
    "i": ["Ciao, questa è la mia voce. Spero ti piaccia.", "Nel mezzo del cammin di nostra vita mi ritrovai per una selva oscura."],
    "a": ["Hello, this is my voice. I hope you like it.", "The quick brown fox jumps over the lazy dog."],
    "b": ["Hello, this is my voice. I hope you like it.", "The quick brown fox jumps over the lazy dog."],
    "f": ["Bonjour, voici ma voix. J'espère qu'elle vous plaît.", "Portez ce vieux whisky au juge blond qui fume."],
    "e": ["Hola, esta es mi voz. Espero que te guste.", "El veloz murciélago hindú comía feliz cardillo y kiwi."],
    "p": ["Olá, esta é a minha voz. Espero que goste.", "O rápido jabuti marrom pula sobre o cachorro preguiçoso."],
}

VOICES = [
    {"id":"if_sara", "lang":"i"}, {"id":"im_nicola", "lang":"i"},
    {"id":"af_heart", "lang":"a"}, {"id":"af_bella", "lang":"a"}, {"id":"af_nicole", "lang":"a"},
    {"id":"af_sky", "lang":"a"}, {"id":"af_alloy", "lang":"a"}, {"id":"af_aoede", "lang":"a"},
    {"id":"af_jessica", "lang":"a"}, {"id":"af_kore", "lang":"a"}, {"id":"af_nova", "lang":"a"},
    {"id":"af_river", "lang":"a"}, {"id":"af_sarah", "lang":"a"}, {"id":"am_adam", "lang":"a"},
    {"id":"am_liam", "lang":"a"}, {"id":"am_michael", "lang":"a"}, {"id":"am_echo", "lang":"a"},
    {"id":"am_eric", "lang":"a"}, {"id":"am_fenrir", "lang":"a"}, {"id":"am_onyx", "lang":"a"},
    {"id":"am_puck", "lang":"a"}, {"id":"am_santa", "lang":"a"},
    {"id":"bf_emma", "lang":"b"}, {"id":"bf_lily", "lang":"b"}, {"id":"bf_alice", "lang":"b"},
    {"id":"bf_isabella", "lang":"b"}, {"id":"bm_fable", "lang":"b"}, {"id":"bm_george", "lang":"b"},
    {"id":"bm_lewis", "lang":"b"}, {"id":"bm_daniel", "lang":"b"},
    {"id":"ff_siwis", "lang":"f"},
    {"id":"ef_dora", "lang":"e"}, {"id":"em_alex", "lang":"e"}, {"id":"em_santa", "lang":"e"},
    {"id":"pf_dora", "lang":"p"}, {"id":"pm_alex", "lang":"p"}, {"id":"pm_santa", "lang":"p"},
]

def save_wav(path, audio_np, sr=24000):
    peak = max(np.max(np.abs(audio_np)), 1e-9)
    audio_np = audio_np / peak * 0.95
    audio_i16 = (audio_np * 32767).astype(np.int16)
    with wave.open(path, 'wb') as wf:
        wf.setnchannels(1); wf.setsampwidth(2); wf.setframerate(sr)
        wf.writeframes(audio_i16.tobytes())

def main():
    from mlx_audio.tts.utils import load_model
    print("Loading Kokoro model...")
    model = load_model("mlx-community/Kokoro-82M-bf16")
    print("Generating previews...")
    total = len(VOICES); success = 0
    for idx, v in enumerate(VOICES):
        vid, lang = v["id"], v["lang"]
        lang_phrases = PHRASES.get(lang, PHRASES["a"])
        for pi, phrase in enumerate(lang_phrases):
            out_path = os.path.join(PREVIEW_DIR, f"{vid}_{pi}.wav")
            if os.path.exists(out_path):
                success += 1; continue
            try:
                audio = None
                for result in model.generate(text=phrase, voice=vid, lang_code=lang):
                    if result.audio is not None:
                        audio = np.array(result.audio)
                if audio is None or len(audio) == 0:
                    print(f"  [{idx+1}/{total}] {vid} #{pi} — EMPTY")
                    continue
                save_wav(out_path, audio)
                print(f"  [{idx+1}/{total}] {vid} #{pi} — {len(audio)/24000:.1f}s ✓")
                success += 1
            except Exception as e:
                print(f"  [{idx+1}/{total}] {vid} #{pi} — ERR: {e}")
    expected = sum(len(PHRASES.get(v["lang"], PHRASES["a"])) for v in VOICES)
    print(f"\nDone: {success}/{expected} clips → {PREVIEW_DIR}/")
    manifest = {}
    for v in VOICES:
        if os.path.exists(os.path.join(PREVIEW_DIR, f"{v['id']}_0.wav")): manifest[v["id"]] = True
    with open(os.path.join(PREVIEW_DIR, "manifest.json"), "w") as f: json.dump(manifest, f)
    print(f"Manifest: {len(manifest)}/{total} voices")

if __name__ == "__main__":
    main()
