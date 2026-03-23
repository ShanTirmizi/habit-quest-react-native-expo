# HabitQuest - Claude Code Instructions

## Project Overview

HabitQuest is a gamified habit tracking app built with React Native (Expo) and Convex backend. It features an AI companion (Dr. Sage) powered by Claude, journaling, medicine tracking, and RPG-style progression (XP, levels, HP, streaks, bosses, skill trees).

## Tech Stack

- **Frontend:** React Native + Expo (managed workflow, dev builds for native modules)
- **Backend:** Convex (schema, mutations, queries, actions)
- **AI:** Anthropic Claude API (chat, coaching insights, memory extraction)
- **Language:** TypeScript (strict)
- **Styling:** React Native StyleSheet with theme system (`constants/theme.ts`)
- **State:** Convex reactive queries + local React state

## TypeScript Rules

- **NEVER use `any` as a type.** Always use proper types, interfaces, or generics. If the type is complex or comes from a third-party library, use the library's exported types, `typeof`, `ReturnType<>`, `Awaited<>`, or define an explicit interface. If a type is truly unknown, use `unknown` and narrow it with type guards.
- Use Convex's `Doc<'tableName'>` for document types from the schema.
- Use Convex's `Id<'tableName'>` for document IDs.
- For Convex query/mutation return types that enrich documents (e.g., `getHabits` adds `completedDates` and `streak`), define an explicit interface or use inline object types rather than `any`.

## Convex Conventions

- Deploy with `npx convex deploy --yes` (non-interactive mode).
- Schema is defined in `convex/schema.ts` using Convex validators (`v.string()`, `v.number()`, etc.).
- Actions (server-side, `"use node"`) are used for external API calls (Claude, etc.).
- Queries are read-only and cannot perform mutations. Use flag-based patterns when a query detects something that needs mutation (e.g., `expired: true` flag for holiday auto-end).

### Authorization — CRITICAL

**Every query AND mutation that takes a `userId` argument MUST call `await verifyAuth(ctx, args.userId)` as its first line.** No exceptions. This includes read-only queries — Convex queries are callable by any authenticated client, so a query without auth verification lets any logged-in user read any other user's data by guessing their ID.

- Import from the shared module: `import { verifyAuth } from './lib/auth'`
- For functions that derive userId from the session (no `userId` arg), use `requireAuth(ctx)` from the same module.
- The ONLY exception is `internalMutation` / `internalQuery` functions that are called server-to-server (e.g., from scheduled jobs or actions) — these have no client-accessible endpoint.
- When adding a new query or mutation, always ask: "Does this access user-specific data?" If yes, it needs auth.

### No Duplicated Logic Across Files

**Never copy-paste the same function, constant, or config object into multiple files.** If logic is needed in more than one file, it MUST live in a shared module under `convex/lib/` and be imported.

Shared modules that already exist — always check these before creating anything new:
- **`convex/lib/auth.ts`** — `verifyAuth(ctx, userId)` and `requireAuth(ctx)`. Never redefine auth helpers locally.
- **`convex/lib/constants.ts`** — `MEDICINE_CONFIG`, `HP_CONFIG`, `UNDERWORLD_CONFIG`, `computeLevel(totalXp)`, `USER_DATA_TABLES`. Never hardcode these values in individual files.

If you find yourself writing the same logic a second time, stop and extract it into `convex/lib/` first.

## File Structure

- `app/` - Expo Router screens (file-based routing)
- `app/(tabs)/` - Main tab screens (index=dashboard, chronicles=journal, insights, quests, medicines)
- `components/` - Reusable components organized by domain (widgets/, overlays/, habits/, ui/, ai-coach/, voice/)
- `convex/` - Backend functions (queries, mutations, actions, schema)
- `hooks/` - Custom React hooks
- `lib/` - Utility libraries (coaching/, keystone-detection, compassion-engine, etc.)
- `types/` - Shared TypeScript type definitions
- `constants/` - Theme, colors, configuration
- `contexts/` - React contexts (auth, theme, toast)

## Styling

- Use the theme system: `useTheme()` hook returns `colors` object.
- Create styles with `createStyles(colors: ThemeColors)` pattern.
- Use constants from `theme.ts`: `FontSize`, `Spacing`, `Radius`, `FontFamily`, `Shadows`.
- Never hardcode colors - always reference `colors.*`.

## Testing Changes

- Run `npx tsc --noEmit` to verify TypeScript compilation before considering work done.
- Deploy Convex changes with `npx convex deploy --yes`.
