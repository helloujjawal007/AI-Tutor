# Tables Buddy - Multiplication Tables Learning App

## Overview
Tables Buddy is a talking virtual assistant that teaches multiplication tables to Class 4-5 children (ages 9-11). The assistant speaks a table line, asks the child to repeat it aloud, listens, and keeps repeating until the child says it correctly.

## Core Experience

### Getting Started
1. Open the app on phone, tablet, or laptop
2. Tap the "▶ Start" button (required - browsers block audio until user taps)
3. Enter child's name and select preferences
4. The assistant greets the child and begins the lesson

### Learning Modes
- **Repeat After Me** (default): Assistant speaks a line, child repeats, gets feedback
- **Listen**: Assistant recites the full table slowly, no mic needed
- **Recall**: Assistant says "7 × 6?" child answers "forty-two"
- **Mixed Challenge**: Random questions from learned tables
- **Parent's Pick**: Parent chooses which tables to practice

### Recitation Styles
- Indian: "Seven ones are seven, seven twos are fourteen..."
- Times: "7 times 1 is 7"
- Hindi: "सात एकम सात, सात दूनी चौदह..."

## Speech Technology

### Text-to-Speech
- Web Speech API `speechSynthesis`
- `en-IN` voice preferred, fall back to any English voice
- Speed slider: 0.6x - 1.2x
- Pitch control available
- Hindi uses `hi-IN` voice

### Speech-to-Text
- Web Speech API `SpeechRecognition` / `webkitSpeechRecognition`
- `lang = "en-IN"`, `interimResults = true`, `maxAlternatives = 5`
- All alternatives checked, not just the first
- 6-second silence timeout with prompt: "I'm waiting, you can say it!"

### Answer Matching Engine
The critical `matchSpoken(expected, transcriptAlternatives)` function:
- Lowercases, strips punctuation, removes fillers ("um", "uh", "the")
- Converts number words to digits ("forty two" → 42)
- Handles homophones ("to/too" → 2, "for" → 4, "ate" → 8, "won" → 1, "tree" → 3, "sick/sex" → 6)
- Normalizes connectors across styles: "into", "times", "multiplied by", "x", "are", "is", "equals", "="
- Tolerant comparison: exact match → token-level fuzzy (Levenshtein ≤ 1) → similarity ≥ 0.8
- Number must always be exactly right; leniency only on connectors
- Returns `{ correct, score, heard, reason }` where reason is one of: "ok", "partial", "wrong_number", "silent"

## Tutoring & Memory Logic

### Leitner SRS System
- Each table line (e.g., "7×6") has a box position 1-5
- Correct on first try moves up; wrong moves back to box 1
- Boxes determine frequency in Mixed/Recall modes
- Box 1 = highest priority (needs most practice)
- Box 5 = mastered (rarely appears)

### Daily Plan
- 1 new table (or continue last one)
- 5-10 review lines from weak items
- Streak counter tracks consecutive days practiced

### Rewards
- 3 stars for perfectly learned line on first try
- 1 star for later tries
- Badges: "Table of 7 Champion", "5-day streak", "100 correct"
- No losing points or negative sounds

## UI/UX

### Design
- Mobile-first, fully responsive (phones, tablets, laptops)
- Friendly animated mascot (Buddy the robot/space explorer/dinosaur)
- Big touch targets (≥ 56px)
- High-contrast, rounded fonts (Baloo 2 / Nunito)
- Bright but not overwhelming colors
- Dark/light toggle

### Features
- Current line shown in large text with live highlighting
- Complete table grid below, mastered lines turn green, weak lines orange
- Sound effects (soft chime, cheer) with mute toggle
- Confetti on milestones
- respects `prefers-reduced-motion`
- One-tap "Pause" and "Stop" at any time
- No ads, no external links, no distractions

### Parent Area
- PIN-protected or maths gate ("What is 12 × 13?")
- Settings, progress reports, daily stats
- Download report as PDF
- Weekly progress email

## Technology Stack

### Frontend
- Next.js 14+ (App Router) + TypeScript + Tailwind CSS
- Framer Motion for animations
- Recharts for charts
- Zustand for state management
- PWA (manifest + service worker) for offline use and home screen install

### Hosting
- Vercel (Next.js app)
- Supabase Postgres with Row Level Security
- Render (Node.js worker for cron jobs)

### Database & Auth
- Supabase Auth (email magic link + Google)
- Row Level Security on all tables
- Tables: profiles, children, child_settings, table_lines_progress, sessions, attempts, badges, child_badges, daily_stats

### Backend Worker
- Node.js (Express) on Render
- Cron jobs for weekly email and daily reminders
- Optional Whisper API fallback for STT

## Safety & Privacy

### Data Collection (Minimum)
- Parent's email only
- Child's first name/nickname only
- No child photos, no location, no third-party trackers, no ads

### Compliance
- Browser speech recognition may be processed by vendor (Google for Chrome)
- Parental consent aligned with India's DPDP Act 2023
- "Delete all my child's data" button available
- Secure by default: Supabase RLS, server-only secrets, Zod validation, rate limiting, CSRF-safe cron

## Quality Requirements

### Accessibility
- Keyboard navigable
- ARIA labels on all interactive elements
- Captions of everything spoken
- Colour-blind-safe palette

### Performance
- Lighthouse ≥ 90 on mobile
- Lazy-load charts

### Error Handling
- Mic blocked → friendly full-screen help + "Type Answer" fallback
- No voices loaded yet → wait for `voiceschanged` event
- Network offline → gracefully degraded experience
- Supabase down → localStorage fallback (guest mode)

### Testing
- Unit tests for matcher and SRS logic
- Playwright e2e test walking through one full table
- 40+ matcher test cases (Indian-accent variations, homophones, partial sentences, silence)

## Folder Structure

```
tables-buddy/
├── app/                # Next.js 14 App Router pages
├── components/         # React components
├── lib/
│   ├── speech/         # Speech service (TTS, STT, matcher)
│   ├── srs/            # Leitner spaced-repetition system
│   └── lesson/         # Lesson engine state machine
├── supabase/
│   └── migrations/     # SQL migrations with RLS
├── tests/              # Jest/Vitest test files
├── scripts/            # Render worker scripts
├── .env.example        # Environment variables
├── tailwind.config.js  # Custom theme configuration
├── next.config.ts      # Next.js configuration
└── render.yaml         # Render deployment config
```

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# 3. Run development server
npm run dev

# 4. Open http://localhost:3000
# 5. Enter child's name and tap "▶ Start"
```

## Test Coverage

The matcher function has 40+ test cases covering:
- Indian-accent variations
- Number word homophones (to/too/two, for/four, ate/eight, won/one, tree/three, sick/sex)
- Partial sentences with fillers
- Silence detection
- Connector word normalization across styles
- Number word to digit conversion
- Exact match, fuzzy match, and similarity scoring

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Web Speech API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
