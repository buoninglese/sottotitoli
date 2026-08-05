#!/usr/bin/env python3
"""
Sottotitoli local dev server — blocks internal docs from public access.

Usage:
    python3 serve.py          # Default: port 8000
    python3 serve.py 3000     # Custom port

Blocked paths return 403:
    /docs/ai/           — AI agent documentation (internal)
    /docs/archive/      — Archived design docs
    /supabase/          — Database migrations & edge functions
    /dev/               — Developer tools
    /tmp/               — Temporary files
    /test/              — Test files
    /scripts/           — Utility scripts
    /tools/             — Tool pages
    /backups/           — Backup archives
    /extra-help/        — Extra help docs
    /mockup-relics/     — Design mockups
    /Reference-mockups/ — Reference mockups
    /mockups/           — Mockup files
    /hugging-voice/     — Voice space source
    /voice-core/        — Voice core source
    /__pycache__/       — Python cache
    /config.js          — Production config
    /config.secrets.js  — Production secrets

Standard HTML/CSS/JS/asset files are served normally.
"""

import http.server
import socketserver
import sys
import os

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000

BLOCKED_PREFIXES = [
    '/docs/ai/',
    '/docs/archive/',
    '/supabase/',
    '/dev/',
    '/tmp/',
    '/test/',
    '/scripts/',
    '/tools/',
    '/backups/',
    '/extra-help/',
    '/mockup-relics/',
    '/Reference-mockups/',
    '/mockups/',
    '/hugging-voice/',
    '/hugging-voice-base/',
    '/hugging-voice-kokoro/',
    '/hf-image-studio/',
    '/voice-core/',
    '/__pycache__/',
]

BLOCKED_FILES = [
    '/config.js',
    '/config.secrets.js',
    '/actions.log',
    '/AGENTS.md',
    '/CLAUDE.md',
    '/DESIGN.md',
    '/package.json',
    '/package-lock.json',
    '/tailwind.config.js',
    '/serve.py',
    '/sync_voice.py',
    '/ws-publisher.js',
    '/security-utils.js',
    '/lesson-report.js',
    '/text-rules.js',
    '/app.js',
    '/session-utils.js',
    '/translation-providers.js',
    '/style.css',
]


class SottotitoliHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Normalize path
        path = self.path.split('?')[0]

        # Check blocked files
        for blocked in BLOCKED_FILES:
            if path == blocked or path.startswith(blocked):
                self.send_error(403, f'Forbidden: {path}')
                return

        # Check blocked directories
        for blocked in BLOCKED_PREFIXES:
            if path.startswith(blocked):
                self.send_error(403, f'Forbidden: {path}')
                return

        # Serve normally
        super().do_GET()

    def log_message(self, format, *args):
        # Suppress 403 log noise if desired — comment out to see all
        if args and '403' in str(args[0]):
            pass  # silent
        else:
            super().log_message(format, *args)


if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    with socketserver.TCPServer(("", PORT), SottotitoliHandler) as httpd:
        print(f"🔒 Sottotitoli dev server — http://localhost:{PORT}")
        print(f"   Blocked: {', '.join(BLOCKED_PREFIXES)}")
        print(f"   Press Ctrl+C to stop")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n👋 Stopped.")
