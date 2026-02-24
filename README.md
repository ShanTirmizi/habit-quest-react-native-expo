# HabitQuest

A gamified habit tracking app that turns your daily routines into an RPG adventure. Build habits, earn XP, level up, defeat weekly bosses, and get AI-powered coaching from Dr. Sage.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo 54, React Native 0.81, React 19 |
| Navigation | Expo Router 6 (file-based) |
| Backend | Convex (real-time serverless) |
| Auth | Convex Auth (Email/Password, Google, Apple) |
| AI | Anthropic Claude API |
| Animations | React Native Reanimated 4 |
| Notifications | Expo Notifications |
| Language | TypeScript 5.9 |

## Features

### Core

- **Habit Tracking** — Create habits across 4 categories (Health, Career, Mind, Life) with flexible scheduling (daily, weekdays, weekends, custom, X times/week)
- **Journal (Chronicles)** — Daily gratitude entries, mood tracking, weekly reflections, AI memory extraction
- **Side Quests** — One-off tasks with priority levels and XP rewards
- **Medicine Tracker** — Medication adherence with scheduled times, groups, reminders, and streak tracking
- **Goals** — Goal setting with milestones, check-ins, progressive phases, and linked habits
- **Insights** — Weekly stats, completion heatmap, category breakdowns, achievement medals, skill tree

### Gamification

- **XP & Leveling** — Earn XP for completions, level up with celebrations
- **HP System** — Lose HP for missed habits, heal on completions, faint at 0 HP
- **Companions** — Choose from 4 species (Treant, Phoenix, Owl, Keeper) that evolve through 4 stages
- **Weekly Bosses** — Defeat bosses by completing habits throughout the week
- **Oracle Challenges** — Daily AI-generated challenges with bonus XP
- **Streaks & Freezes** — Maintain streaks with limited freeze protection
- **Achievements & Titles** — Unlock medals and equip titles
- **Skill Tree** — Spend XP on passive bonuses (discipline, wellness, growth, balance)
- **Underworld** — Failure recovery system after fainting

### AI Features

- **Dr. Sage Coach** — Personalized daily insights analyzing your habit patterns, journal entries, and streaks (powered by Claude)
- **AI Memories** — The system learns your preferences, blockers, and strategies over time
- **Chat** — Conversational coaching with Dr. Sage

## Project Structure

```
app/
  (tabs)/          # Main tab screens (dashboard, chronicles, quests, medicines, insights, goals)
  (auth)/          # Login screen
  settings.tsx     # Settings with notifications, legal, account deletion
  onboarding.tsx   # 3-screen intro flow
  privacy-policy.tsx
  terms-of-service.tsx

components/
  ai-coach/        # CoachPanel
  habits/          # HabitCard, HabitDetailSheet, AddHabitSheet
  widgets/         # CompanionWidget, OracleChallengeCard
  overlays/        # LevelUpCelebration, UnderworldOverlay
  ui/              # Button, Input, GradientCard, BentoGrid, CircularProgress, etc.

convex/
  schema.ts        # 17 app tables + auth tables
  habits.ts        # CRUD + completions + streaks
  progress.ts      # XP, HP, leveling, boss damage
  coaching.ts      # AI insights generation (Anthropic API)
  chat.ts          # Dr. Sage conversations + AI memories
  companions.ts    # Companion system
  oracle.ts        # Challenge generation
  medicines.ts     # Medicine tracking + adherence
  journal.ts       # Journal entries
  goals.ts         # Goal management
  notifications.ts # Push token registration + preferences
  accountDeletion.ts # Cascade delete across all tables

contexts/          # AuthProvider, ToastProvider
hooks/             # Push notifications, habits, journal, XP
constants/theme.ts # Design tokens (colors, fonts, spacing, shadows)
```

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- A [Convex](https://convex.dev) account

### Setup

```bash
# Install dependencies
npm install

# Set up Convex
npx convex dev

# Start the app
npx expo start
```

### Environment Variables (Convex Dashboard)

| Variable | Description |
|----------|------------|
| `ANTHROPIC_API_KEY` | Claude API key for AI coaching features |

### Auth Providers (Convex Dashboard)

Configure these in your Convex auth settings:
- **Google OAuth** — Client ID + Secret
- **Apple Sign In** — Service ID + Secret (iOS only)

## Scripts

```bash
npx expo start          # Start dev server
npx expo start --ios    # Start on iOS simulator
npx expo start --android # Start on Android emulator
npx convex dev          # Run Convex in dev mode
npx convex codegen      # Regenerate Convex types
```

## Design

The app uses a custom dark theme ("Meridian") with the Sora font family. Key design tokens:

- **Primary**: `#8B5CF6` (violet)
- **Accent**: `#F97316` (orange)
- **Background**: `#060810` (deep navy)
- **Cards**: Solid surfaces with shadow depth (no blur/glass morphism)
- **Tab Bar**: Floating pill shape

## License

Private — All rights reserved.
