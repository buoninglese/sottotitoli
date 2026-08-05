# ideal-customer.md — Sottotitoli Ideal Customer Profile

> **For any AI agent working on marketing, positioning, or feature prioritization.**
> Know who we're building for.

---

## 1. Primary Persona: "The Immigrant Language Learner"

### Demographics
- **Age:** 25–45
- **Location:** Living in Italy, not a native Italian speaker
- **Native language:** English, Dutch, German, or other European language
- **Occupation:** Professional, student, or expat
- **Tech comfort:** High — comfortable with web apps, browser tools

### Situation
- Lives in Italy and needs to understand Italian daily
- Attends meetings, lectures, or events in Italian
- Watches Italian media (news, YouTube, streaming)
- Practices Italian regularly but struggles with real-time comprehension
- May have taken classes but needs practical immersion

### Pain Points
- "I understand written Italian but spoken Italian is too fast"
- "I miss key words in meetings and feel lost"
- "I can't participate fully because I'm always translating in my head"
- "Language apps teach vocabulary but not real-time comprehension"
- "Existing translation tools are clunky — I need something seamless"

### Goals
- Understand spoken Italian in real time
- Build vocabulary from actual usage (not flashcards)
- Track progress over weeks and months
- Feel confident in Italian conversations

---

## 2. Secondary Persona: "The Language Enthusiast"

### Demographics
- **Age:** 20–60
- **Location:** Anywhere (remote user)
- **Native language:** Any
- **Occupation:** Varied
- **Tech comfort:** Medium-high

### Situation
- Passionate about learning languages
- Practices multiple languages
- Uses tools like Duolingo, Anki, iTalki
- Looking for immersion tools beyond apps

### Pain Points
- "I want to watch foreign content without dubbed subtitles"
- "I want to learn from real conversations, not textbook dialogs"
- "I need to see grammar patterns in context"

### Goals
- Consume native content in target language
- Build vocabulary organically
- Understand grammar through exposure

---

## 3. Tertiary Persona: "The Accessibility User"

### Demographics
- **Age:** Any
- **Location:** Primarily Italy
- **Situation:** Deaf or hard of hearing, or needs live captions for accessibility

### Pain Points
- "Live events and meetings don't have captions"
- "Existing caption tools are expensive or require special hardware"
- "I need real-time captions, not delayed ones"

### Goals
- Access live conversations and events
- Read captions in preferred language
- Participate fully in group settings

---

## 4. Customer Journey

### Discovery
- Searches for "real-time Italian captions" or "live translation tool"
- Finds via word of mouth from language learning communities
- Lands on `index.html` (the parallax landing page)

### Signup (Onboarding)
- Clicks "Avvia una sessione gratuita" → Google OAuth
- Lands on `onboarding.html` → selects language pair, goals, preferences
- Directed to `panoramica.html` dashboard

### First Session (Aha Moment)
- Opens `caption-s8t.html` or `studio.html`
- Starts speaking / plays audio → sees live captions
- Realizes translation appears alongside
- "Wow, I can actually understand this"

### Habit Formation
- Uses daily for Italian media consumption
- Checks Panoramica for progress metrics
- Explores vocabulary builder, grammar correction

### Upgrade Trigger
- Hits 15 min/week free limit → prompted to purchase
- Wants AI reports, CEFR analysis → needs Voice Credits
- Purchases via `purchase.html` → Stripe checkout

### Retention Loop
- Dashboard shows "Il tuo viaggio" (Your journey) with progress
- Session history, vocabulary growth, CEFR level tracking
- Referral program brings in new users

---

## 5. What They're NOT

- ❌ Enterprise teams needing conference-room captioning (not our market)
- ❌ Professional translators (they need CAT tools, not real-time)
- ❌ Children learning their first language (UI is adult-professional)
- ❌ One-time users looking for a quick translation of a single phrase
- ❌ Developers wanting an API (we're a consumer product)

---

## 6. Key Acquisition Channels

| Channel | Why |
|---------|-----|
| Language learning forums/Reddit | Immigrant learners congregate here |
| Expat communities in Italy | High-intent audience |
| YouTube/direct | Demo videos of live captioning |
| App stores (future) | Mobile web app potential |
| Word of mouth | Referral program built in |

---

## 7. Pricing Sensitivity

- **Free tier:** 15 min/week — hook for trial
- **Starter:** ~€10 for 50h (3000 min) — mass market
- **Tokens:** ~€10 for 90 AI report tokens — premium feature
- **Willing to pay** for convenience, not gimmicks
- **Price-sensitive** compared to US market (Italian/European pricing expectations)
- **Prepaid model** (not subscription) — aligns with usage-based learning

---

*Last updated: 2026-08-05*
