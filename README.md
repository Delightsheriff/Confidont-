# Confidont

A confidence coaching app that helps you become comfortable on camera — one short session at a time.

## What it does

Confidont is a coaching app that uses AI to analyze your video sessions and provide feedback on your confidence markers: eye contact, composure, and filler word usage. Pick a coach persona, speak on a topic, and get real-time feedback to improve your on-camera presence.

## Features

- **Personalized coaching** — Choose from different coach personas that match your vibe
- **Video analysis** — Real-time eye contact, composure, and filler word detection
- **Progress tracking** — See your improvement over time with detailed session scores
- **Daily limits** — Configurable daily session limits (soft nudge to return tomorrow)
- **Tiered access** — Free tier with limited sessions, premium unlock for unlimited practice
- **Privacy-first** — All video processing happens locally on your device

## Tech stack

- **Framework**: Next.js 16 (App Router)
- **UI**: shadcn/ui with Radix primitives
- **Styling**: Tailwind CSS v4
- **Icons**: Remix Icon
- **State**: Local storage (no backend required for MVP)

## Project structure

```
confidont/
├── app/                    # Next.js pages
│   ├── page.tsx            # Landing page
│   ├── home/page.tsx       # Dashboard with journey map
│   ├── onboarding/page.tsx # User onboarding flow
│   └── session/page.tsx   # Practice session
├── components/
│   ├── home/              # Journey map component
│   ├── onboarding/        # Onboarding components
│   ├── session/           # Session analyzer & summary
│   └── ui/                # shadcn/ui components
├── lib/
│   ├── ai/                # AI feedback & topics
│   ├── logic/             # Daily limits, business logic
│   └── storage/           # Local storage utilities
├── hooks/                  # Custom React hooks
├── types/                  # TypeScript types
└── configs/                # Tier configuration
```

## Getting started

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

## Key concepts

### Free tier

- Limited to 2 free sessions total (configurable in `configs/tiers.ts`)
- Daily session limit configurable during onboarding
- When daily limit reached: soft nudge with "come back tomorrow"
- When free cap reached: upgrade prompt required

### Premium

- Unlimited sessions
- No daily limits

### Session flow

1. User picks a topic prompt from their coach
2. Records/talks to camera
3. AI analyzes: eye contact, composure, filler words
4. Session summary shows scores + coaching feedback
5. Progress saved to journey map

## Adding components

```bash
npx shadcn@latest add button
```
