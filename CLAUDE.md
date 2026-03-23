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

## React Hooks Rules — CRITICAL

**All hooks must be called before any early returns.** This is React's #1 rule and violating it causes the app to crash with "Rendered more hooks than during the previous render."

When adding a new hook (`useState`, `useCallback`, `useEffect`, `useMemo`, `useRef`, `useQuery`, `useMutation`, `useAction`, `useSharedValue`, `useAnimatedStyle`, or any custom hook) to an existing component:

1. **Search the component for ALL early returns** (`return` statements that are NOT the final JSX return). Common patterns: `if (loading) return null`, `if (!data) return <Skeleton />`, `if (error) return <ErrorView />`.
2. **Place the new hook ABOVE every early return.** No exceptions. Even if the hook's value is only used in the non-early-return path, it must still be called unconditionally.
3. **Never place hooks inside conditional blocks, loops, or after early returns.**
4. **When refactoring:** if you move an early return higher in the component, audit all hooks below it to make sure none are now after it.

This rule applies to custom hooks too — if `useMyHook()` calls 5 hooks internally, placing it after an early return means 5 hooks disappear on certain renders.

**Verification:** After modifying any component, grep for `useCallback\|useState\|useEffect\|useMemo\|useRef` and verify every match appears before any `return` that isn't the final render return.

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

### Screen Layout Conventions — FOLLOW THESE EXACTLY

When creating any new screen, **copy the exact patterns below**. Do NOT invent new header or layout patterns. Reference `app/settings.tsx` or `app/goals.tsx` as canonical examples.

#### Container & Safe Area

Every screen root: `<View style={[styles.container, { paddingTop: insets.top }]}>` where `container` is `{ flex: 1, backgroundColor: colors.background }`.

Bottom safe area: apply in ScrollView contentContainerStyle or input bar: `paddingBottom: Math.max(insets.bottom, Spacing.md)`.

#### Back Button (all non-tab screens)

```tsx
<Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
  <Ionicons name="chevron-back" size={24} color={colors.foreground} />
</Pressable>
```

Style — **never deviate from these values:**
```ts
backButton: {
  width: 36,
  height: 36,
  borderRadius: Radius.sm,
  backgroundColor: colors.surfaceLight,
  alignItems: 'center',
  justifyContent: 'center',
}
```

#### Header Bar

```ts
header: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: Spacing.lg,
  paddingVertical: Spacing.md,
}
headerTitle: {
  fontFamily: FontFamily.semibold,
  fontSize: FontSize.lg,
  color: colors.foreground,
}
headerSpacer: { width: 36 }  // balances the back button
```

Layout order: `[backButton] [title (centered)] [spacer or action button]`.

#### Content Padding

- Screen-level horizontal padding: **`Spacing.lg`** (applied to ScrollView contentContainerStyle or wrapper).
- Section gap: **`Spacing.sm`** (between cards/sections).
- Card internal padding: **`Spacing.lg`** horizontal, **`Spacing.md`** vertical.

#### Pressable Interaction

All Pressable components must use a consistent pressed state:
```tsx
style={({ pressed }) => [styles.myButton, pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] }]}
```

#### Typography Hierarchy

| Use | FontFamily | FontSize |
|-----|-----------|----------|
| Page title (large) | `extrabold` | `FontSize['3xl']` |
| Section header | `semibold` | `FontSize.lg` |
| Body / labels | `regular` or `medium` | `FontSize.base` or `FontSize.sm` |
| Captions / badges | `semibold` | `FontSize.xs` |

#### Cards & Surfaces

```ts
sectionCard: {
  backgroundColor: colors.surface,
  borderRadius: Radius.lg,
  borderWidth: 1,
  borderColor: colors.border,
  overflow: 'hidden',
  ...Shadows.card,
}
```

#### Before Creating a New Screen

1. **Look at an existing screen first** — `settings.tsx` for simple screens, `habit-browser.tsx` for list screens.
2. Copy the header, container, and back button code verbatim — do not reinvent.
3. Match horizontal padding (`Spacing.lg`) and bottom safe area handling.
4. Use `<EmptyState />` for zero-state, `<Skeleton />` for loading state.

## Testing Changes

- Run `npx tsc --noEmit` to verify TypeScript compilation before considering work done.
- Deploy Convex changes with `npx convex deploy --yes`.
