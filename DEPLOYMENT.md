# Tables Buddy - Deployment Guide

This guide covers deploying the complete Tables Buddy application.

## Prerequisites

1. **Supabase Project**: Create a new Supabase project at https://supabase.com
2. **Vercel Account**: For hosting the Next.js app (https://vercel.com)
3. **Render Account**: For the backend worker (https://render.com)

## Step 1: Set up Supabase

### 1.1 Create Project
- Go to supabase.com and create a new project
- Note your project URL and anon key

### 1.2 Run Migration
- Go to SQL Editor in Supabase Dashboard
- Copy and paste the contents of `supabase/migrations/20240101_initial_schema.sql`
- Run the migration

### 1.3 Configure Auth
- In Supabase Dashboard > Authentication > Settings
- Enable Email provider
- Under "URL Configuration", add your Vercel deployment URL
- Set up magic link sign-in

### 1.4 Set up RLS
The migration includes Row Level Security policies. Ensure they are enabled by running:
```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
-- ... etc for all tables
```

### 1.5 Create Admin User
- Create your first parent account via the Auth dashboard
- This account will own all child profiles

## Step 2: Deploy Next.js App to Vercel

### 2.1 Prepare Environment Variables
Create a `.env.local` file in the project root:

```bash
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-public-key

# Optional customization
NEXT_PUBLIC_SPEECH_SPEED=1.0
NEXT_PUBLIC_SPEECH_PITCH=1.0
```

### 2.2 Deploy to Vercel
```bash
# From the project directory
vercel --prod
```

### 2.3 Configure Vercel
- Go to Vercel Dashboard > Your Project > Settings > Environment Variables
- Add the Supabase variables from step 2.1
- Ensure "NEXT_PUBLIC" prefix is kept for client-side access

### 2.4 Set up Redirect URLs
- In Vercel, add the following under Domain & Routing:
  - Root path `/` should serve the app
  - Auth callback URLs should point to your Supabase project

## Step 3: Deploy Render Worker

### 3.1 Create Service
- Go to render.com and create a new Web Service
- Connect your GitHub repository
- Set build command: `npm install && npm run build`
- Set start command: `next start -p $PORT`

### 3.2 render.yaml Configuration
Create `render.yaml` in the project root:

```yaml
services:
  - type: web
    name: tables-buddy-worker
    env: node
    buildCommand: npm install && npm run build
    startCommand: node server/render-worker.js
    envVars:
      SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL}
      SUPABASE_KEY: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      RESend_API_KEY: ${RESEND_API_KEY}
```

### 3.3 Worker Endpoints

The worker provides three protected cron endpoints:

#### 3.3.1 Weekly Progress Email
```
POST /build-and-send-weekly-email
Header: X-Cron-Secret: your-secret-header-value
```
- Triggers email to all parents with weekly progress
- Includes accuracy per table, lines mastered, streak calendar
- Uses Resend or SMTP to send emails

#### 3.3.2 Daily Reminder
```
POST /daily-reminder
Header: X-Cron-Secret: your-secret-header-value
```
- Sends reminder to children who haven't practiced today
- Includes "Today's Plan: 1 new table + 5 review lines"

#### 3.3.3 Transcribe Fallback (Optional)
```
POST /transcribe
Header: X-Cron-Secret: your-secret-header-value
Body: { child_id, session_id, audio_url }
```
- Uses Whisper API as higher-accuracy STT fallback
- Returns corrected text for failed recognition attempts

### 3.4 Cron Job Setup
- Set up Render cron jobs to trigger the endpoints
- Weekly email: once per week, e.g., Sundays at 9 PM
- Daily reminder: daily at 4 PM

## Step 4: Test on Real Phone

### 4.1 Enable PWA
- On phone, visit your Vercel URL
- Add to home screen when prompted
- Test that the app works offline

### 4.2 Test Speech Features
- Chrome/Edge on Android works best
- Safari iOS has limited Web Speech API support
- If microphone is blocked, "Type Answer" mode is available

### 4.3 Test Offline
- Disable wifi/mobile data
- App should still display loaded tables
- Speech features will be unavailable offline

## Step 5: Post-Deployment Checklist

- [ ] Supabase migration ran successfully
- [ ] Auth magic links work
- [ ] Parent can create child profiles
- [ ] Lesson loop starts and runs correctly
- [ ] Speech recognition works on target devices
- [ ] TTS speaks correct lines
- [ ] Answer matching handles accents correctly
- [ ] SRS box updates on correct/incorrect
- [ ] Progress saves to Supabase
- [ ] PWA can be added to home screen
- [ ] Dark/light mode toggle works
- [ ] Reduced motion preference respected
