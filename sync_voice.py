#!/usr/bin/env python3
"""Sync shared backend files from voice-core/ into each hugging-voice-* sub-project.

Usage:
  python sync_voice.py           # Copy shared files into all voice projects
  python sync_voice.py --check   # CI mode: exit 1 if any project has diverged

Never touches index.html or main.js — those are variant-specific.
"""

import sys
import shutil
import filecmp
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CORE = ROOT / 'voice-core'
PROJECTS = ['hugging-voice', 'hugging-voice-base', 'hugging-voice-kokoro']

# Files and directories that are shared across all three projects.
# These are copied as-is from voice-core/ into each sub-project.
SHARED_FILES = [
    '.dockerignore',
    '.gitignore',
    'CONTEXT.md',
    'DESIGN.md',
    'Dockerfile',
    'README.md',
    'auth.py',
    'limiter.py',
    'requirements.txt',
    'server.py',
    'style.css',
]

SHARED_DIRS = [
    'docs',
    'rtc',
    'ui',
    'worklets',
    'ws',
]


def sync(proj: str) -> list[str]:
    """Copy shared files from voice-core/ into the given project. Returns list of synced paths."""
    dest = ROOT / proj
    synced = []

    for fname in SHARED_FILES:
        src = CORE / fname
        dst = dest / fname
        if not src.exists():
            print(f"  ⚠  {fname}: source missing in voice-core/, skipping")
            continue
        shutil.copy2(src, dst)
        synced.append(f"{proj}/{fname}")

    for dname in SHARED_DIRS:
        src_dir = CORE / dname
        dst_dir = dest / dname
        if not src_dir.is_dir():
            print(f"  ⚠  {dname}/: source missing in voice-core/, skipping")
            continue
        if dst_dir.exists():
            shutil.rmtree(dst_dir)
        shutil.copytree(src_dir, dst_dir)
        synced.append(f"{proj}/{dname}/")

    return synced


def content_equal(path_a: Path, path_b: Path) -> bool:
    """Compare two files by content, ignoring trailing whitespace differences.
    Byte-equivalence (filecmp.cmp) is too strict — a trailing newline or
    editor auto-trim in one variant shouldn't block the deploy pipeline."""
    try:
        with open(path_a, 'rb') as f1, open(path_b, 'rb') as f2:
            return f1.read().rstrip() == f2.read().rstrip()
    except OSError:
        return False


def check_divergence() -> int:
    """Return count of diverged files across all projects."""
    diverged = 0
    for proj in PROJECTS:
        dest = ROOT / proj
        for fname in SHARED_FILES:
            src = CORE / fname
            dst = dest / fname
            if not src.exists() or not dst.exists():
                print(f"DIVERGENCE: {proj}/{fname} — file missing")
                diverged += 1
                continue
            if not content_equal(src, dst):
                print(f"DIVERGENCE: {proj}/{fname} — content differs from voice-core/")
                diverged += 1
        for dname in SHARED_DIRS:
            src_dir = CORE / dname
            dst_dir = dest / dname
            if not src_dir.is_dir() or not dst_dir.is_dir():
                print(f"DIVERGENCE: {proj}/{dname}/ — directory missing")
                diverged += 1
                continue
            comparison = filecmp.dircmp(str(src_dir), str(dst_dir))
            if comparison.diff_files or comparison.left_only or comparison.right_only:
                print(f"DIVERGENCE: {proj}/{dname}/ — differs from voice-core/")
                if comparison.diff_files:
                    print(f"  diff files: {comparison.diff_files}")
                if comparison.left_only:
                    print(f"  only in voice-core: {comparison.left_only}")
                if comparison.right_only:
                    print(f"  only in {proj}: {comparison.right_only}")
                diverged += 1
    return diverged


def main() -> int:
    if not CORE.is_dir():
        print("❌ voice-core/ directory not found. Create it first with shared backend files.")
        return 1

    if '--check' in sys.argv:
        print("🔍 Checking voice project divergence from voice-core/...")
        count = check_divergence()
        if count == 0:
            print("✅ All voice backends are in sync with voice-core/")
            return 0
        else:
            print(f"❌ {count} divergence(s) found. Run 'python sync_voice.py' to sync.")
            return 1

    # Sync mode
    print(f"🔄 Syncing {len(PROJECTS)} voice projects from voice-core/...")
    for proj in PROJECTS:
        dest = ROOT / proj
        if not dest.is_dir():
            print(f"  ⚠  {proj}/ not found, skipping")
            continue
        synced = sync(proj)
        print(f"  ✅ {proj}/ — {len(synced)} items synced")

    # Verify after sync
    print("\n🔍 Verifying...")
    count = check_divergence()
    if count == 0:
        print("✅ All projects verified in sync.")
    else:
        print(f"⚠ {count} divergence(s) remain — manual review needed.")
    return 0


if __name__ == '__main__':
    sys.exit(main())
