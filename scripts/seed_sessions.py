#!/usr/bin/env python3
"""Seed 7 days of realistic session data for studiobuoninglese@gmail.com"""

import os, sys, json, random, subprocess
from datetime import datetime, timedelta, timezone

# ── Get service_role key from supabase CLI ──
result = subprocess.run(
    ["supabase", "projects", "api-keys", "--project-ref", "qzqmuegbpmvqrjrlfbgk"],
    capture_output=True, text=True, cwd="/Users/sebastiankrauwel/sottotitoli"
)
service_key = None
for line in result.stdout.split('\n'):
    if 'service_role' in line:
        parts = line.strip().split('|')
        if len(parts) >= 2:
            service_key = parts[1].strip()
            break

if not service_key:
    # Try alternative: look for the JWT pattern
    import re
    match = re.search(r'(eyJ[A-Za-z0-9\-_]+?\.[A-Za-z0-9\-_]+?\.[A-Za-z0-9\-_]+)', result.stdout)
    if match:
        service_key = match.group(1)

if not service_key:
    print("Could not extract service_role key")
    print(result.stdout)
    sys.exit(1)

print(f"Got service_role key (length {len(service_key)})")

# ── Connect to Supabase ──
from supabase import create_client

SUPABASE_URL = "https://qzqmuegbpmvqrjrlfbgk.supabase.co"
sb = create_client(SUPABASE_URL, service_key)

# ── Find the user ──
print("\nLooking up studiobuoninglese@gmail.com...")
try:
    # Try profiles table first (public)
    resp = sb.table("profiles").select("id, display_name").execute()
    print(f"Profiles: {len(resp.data)} rows")
    
    # Look through auth users
    admin_resp = sb.auth.admin.list_users()
    target_user = None
    for user in admin_resp:
        if user.email == "studiobuoninglese@gmail.com":
            target_user = user
            break
    
    if not target_user:
        # Try querying profiles for matching display_name
        for p in resp.data:
            if 'studiobuoninglese' in str(p.get('display_name', '')).lower():
                target_user = type('obj', (object,), {'id': p['id'], 'email': 'studiobuoninglese@gmail.com'})()
                break
    
    if target_user:
        print(f"Found user: {target_user.id} ({target_user.email})")
    else:
        print("User not found in auth users or profiles")
        print("Available users in profiles:")
        for p in resp.data[:5]:
            print(f"  {p.get('id')} - {p.get('display_name')}")
        sys.exit(1)
        
except Exception as e:
    print(f"Error finding user: {e}")
    # Fallback: try to list all users
    try:
        users = sb.auth.admin.list_users()
        print(f"Auth users: {len(users)} found")
        for u in users[:10]:
            print(f"  {u.id} - {u.email}")
    except Exception as e2:
        print(f"Error listing users: {e2}")
    sys.exit(1)

user_id = target_user.id
print(f"\nUser ID: {user_id}")

# ── Generate 7 days of sessions ──
print("\nGenerating session data...")

random.seed(42)
now = datetime.now(timezone.utc)

# Weekday patterns: more activity on weekdays, less on weekends
day_configs = [
    # (days_ago, sessions_count, min_duration_sec, max_duration_sec, description)
    (6, 3, 120, 900, "Last Thursday - light day"),
    (5, 5, 180, 1800, "Last Friday - productive day"),
    (4, 2, 300, 600, "Last Saturday - weekend casual"),
    (3, 1, 600, 600, "Last Sunday - minimal"),
    (2, 6, 120, 2400, "Monday - heavy study day"),
    (1, 4, 180, 1500, "Tuesday - moderate"),
    (0, 3, 240, 1200, "Today - ongoing"),
]

language_pairs = ["en-US", "en-it", "it-IT"]
session_types = ["caption", "translation", "solo"]
modes = ["caption-en", "translate-en-it", "caption-it"]
topics = ["daily life", "travel", "work", "education", "family", "food", "health", "technology", "culture", "sport"]

inserted = 0

for days_ago, count, min_dur, max_dur, desc in day_configs:
    day_date = now - timedelta(days=days_ago)
    print(f"\n{desc} ({day_date.strftime('%a %d %b')}) — {count} sessions")
    
    for s in range(count):
        # Random start time during the day (8 AM to 10 PM)
        hour = random.randint(8, 22)
        minute = random.randint(0, 59)
        started = day_date.replace(hour=hour, minute=minute, second=0, microsecond=0)
        
        duration = random.randint(min_dur, max_dur)
        lp = random.choice(language_pairs)
        st = "caption" if lp in ("en-US", "it-IT") else "translation"
        mode = f"caption-{lp.lower().replace('-','')}" if st == "caption" else f"translate-{lp.replace('-','')}"
        
        # Realistic metrics
        wpm = random.randint(80, 160) if duration > 120 else random.randint(60, 120)
        words_count = int((duration / 60) * wpm * random.uniform(0.7, 1.0))
        lexical_diversity = round(random.uniform(0.45, 0.85), 3)
        ngsl_coverage = round(random.uniform(0.55, 0.92), 3)
        quality_score = round(random.uniform(3.0, 9.5), 1)
        unique_words = int(words_count * lexical_diversity)
        fillers = int(duration / 60 * random.uniform(0.5, 3.0))
        questions = random.randint(0, int(duration / 120) + 2)
        negations = random.randint(0, int(duration / 180) + 3)
        turn_count = random.randint(5, max(5, int(duration / 30)))
        
        # POS breakdown
        total_pos = max(1, int(words_count * 0.8))
        nouns = int(total_pos * random.uniform(0.18, 0.28))
        verbs = int(total_pos * random.uniform(0.14, 0.22))
        adjs = int(total_pos * random.uniform(0.06, 0.12))
        advs = int(total_pos * random.uniform(0.04, 0.10))
        pronouns = int(total_pos * random.uniform(0.08, 0.14))
        preps = int(total_pos * random.uniform(0.08, 0.12))
        conjunctions = random.randint(0, int(total_pos * 0.05))
        modals = random.randint(0, int(total_pos * 0.03))
        
        # Generate a pseudo-transcript
        sample_words = [
            "the", "be", "to", "of", "and", "a", "in", "that", "have", "I",
            "it", "for", "not", "on", "with", "he", "as", "you", "do", "at",
            "this", "but", "his", "by", "from", "they", "we", "say", "her", "she",
            "or", "an", "will", "my", "one", "all", "would", "there", "their", "what",
            "so", "up", "out", "if", "about", "who", "get", "which", "go", "me",
            "when", "make", "can", "like", "time", "no", "just", "him", "know", "take",
            "people", "into", "year", "your", "good", "some", "could", "them", "see", "other",
            "than", "then", "now", "look", "only", "come", "its", "over", "think", "also",
            "back", "after", "use", "two", "how", "our", "work", "first", "well", "way",
            "even", "new", "want", "because", "any", "these", "give", "day", "most", "us"
        ]
        transcript_lines = []
        words_used = 0
        while words_used < words_count:
            line_len = min(random.randint(5, 20), words_count - words_used)
            line = " ".join(random.choices(sample_words, k=line_len))
            transcript_lines.append(line.capitalize() + ".")
            words_used += line_len
        transcript_text = "\n".join(transcript_lines)
        
        session = {
            "user_id": user_id,
            "language_pair": lp,
            "session_type": st,
            "mode": mode,
            "room": f"{mode}-{random.randint(1000, 9999):04d}",
            "topic_tag": random.choice(topics),
            "started_at": started.isoformat(),
            "ended_at": (started + timedelta(seconds=duration)).isoformat(),
            "duration_seconds": duration,
            "words_count": words_count,
            "wpm": wpm,
            "lexical_diversity": lexical_diversity,
            "ngsl_coverage": ngsl_coverage,
            "unique_words_count": unique_words,
            "quality_score": quality_score,
            "fillers_per_minute": round(fillers / max(1, duration/60), 2),
            "question_count": questions,
            "negation_count": negations,
            "turn_count": turn_count,
            "noun_count": nouns,
            "verb_count": verbs,
            "adjective_count": adjs,
            "adverb_count": advs,
            "pronoun_count": pronouns,
            "preposition_count": preps,
            "conjunction_count": conjunctions,
            "modal_verb_count": modals,
            "transcript_text": transcript_text,
            "repetition_rate": round(random.uniform(0.02, 0.12), 3),
            "speaking_share_ratio": round(random.uniform(0.6, 0.95), 3),
            "interruption_count": random.randint(0, 3),
        }
        
        try:
            result = sb.table("sessions").insert(session).execute()
            if result.data:
                inserted += 1
                print(f"  ✓ {started.strftime('%H:%M')} — {duration//60}m, {words_count} words, {wpm} wpm, {lp}")
            else:
                print(f"  ✗ Insert returned no data")
        except Exception as e:
            print(f"  ✗ Error: {e}")

print(f"\n{'='*50}")
print(f"Done! Inserted {inserted} sessions across 7 days.")
print(f"Refresh panoramica.html to see the data.")
