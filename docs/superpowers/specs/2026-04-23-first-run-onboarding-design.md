---
name: HabitQuest First-Run Onboarding Experience
description: Pre-launch design for a guided first-run flow that teaches the Goals → Habits → XP → Dr. Sage mental model by having users create real data in under three minutes.
status: Draft
date: 2026-04-23
---

# HabitQuest First-Run Onboarding Experience

## Context

HabitQuest is a gamified habit tracker not yet launched publicly. The app bundles several interlocking concepts: Goals (the "why"), Habits (the "how"), XP and HP (the feedback signal), Dr. Sage (the AI coach), Quests (multi-step missions), Medicines (tracked reminders), and Chronicles (journaling).

The current onboarding — three value-prop slides plus an optional neurodivergence personalisation step — teaches none of this. A new user who finishes onboarding and lands on the dashboard does not understand how the pieces fit together, does not have a goal, does not have a habit to complete, and has not met Dr. Sage. The existing `AddGoalWizard` is strong (AI-driven habit generation from a natural-language goal) but invisible to new users until they think to tap "add goal."

This spec designs a first-run experience modeled on the best-in-class pattern used by Duolingo, Finch, Notion AI, and Habitica: **teach by doing**. The user creates a real goal with real habits in the first two minutes, earns their first XP in the third minute, and meets Dr. Sage as the character who just helped them do it.

## Goals

1. The user ends onboarding with a real goal, real habits, at least one completed habit, and has interacted with Dr. Sage.
2. The mental model (Goals → Habits → XP/HP → Dr. Sage → Quests) is taught through the onboarding flow *and* reinforced long-term through narrative empty states on every tab.
3. Every step is skippable. Skipping always lands the user in a state where the next action is visible — no dead ends.
4. Analytics funnel is instrumented from day one so post-launch drop-off is diagnosable.
5. Dr. Sage is established as a character (not a chatbot) by step 5.

## Non-goals

- A persistent multi-day home-screen checklist (the "First week" card). Deferred — revisit after launch metrics arrive.
- Just-in-time coachmarks distributed across every advanced feature. Only one coachmark is in scope (step 4). Everything else is taught through empty states.
- Re-architecting `AddGoalWizard`. This spec wraps the existing wizard with an onboarding mode. Internals are unchanged.
- Re-doing the neurodivergence personalisation step. It stays as-is.

## Design

### Five-step first-run flow

The flow is one contiguous experience rooted in `app/onboarding.tsx`. It does not span multiple routes — each step is a view state inside that screen or a modal launched from it.

| # | Step | Duration | Skippable? | Notes |
|---|------|----------|------------|-------|
| 1 | Welcome slides | ~15s | Yes | Trim from 3 slides to 2. First is value prop, second is the mental model ("Goals → Habits → XP → Dr. Sage"). |
| 2 | ND personalisation | ~30s | Yes (existing) | Unchanged. Must precede step 3 because the ND profile shapes Dr. Sage's habit generation. |
| 3 | Guided first goal | ~90s | Yes | Reuses `AddGoalWizard` with new `onboardingMode` prop. Adds a starter-template pre-step and coaching tooltips. |
| 4 | Feel the reward | ~10s | Yes (tap outside) | Dashboard coachmark pointing at today's first habit. Tapping completes it and triggers XP/HP animation. |
| 5 | Meet Dr. Sage | ~10s | Yes | Bottom sheet from Dr. Sage: "Nice. I'll be here when you want to talk. Tap my icon anytime." |

Target total: ~2.5 minutes for a user who does not skip.

### The guided first-goal wizard (step 3)

`components/goals/AddGoalWizard.tsx` gains a new optional prop:

```ts
interface AddGoalWizardProps {
  visible: boolean;
  onClose: () => void;
  userId: Id<'users'>;
  onboardingMode?: boolean; // new — defaults to false
}
```

When `onboardingMode` is `true`, the wizard behaves as follows:

**Pre-step: Starter template picker** — a new first screen rendered before `goal-input`. Six tiles mapping 1-to-1 to the existing `GoalCategory` values (`fitness`, `learning`, `career`, `health`, `creative`, `financial`). Each tile has an emoji, label, one-line subtitle, and a `prefillText` string. A seventh, dashed option: "I know what I want — let me type it." Selecting a tile advances to `goal-input` with the text pre-filled; selecting the free-text option advances with an empty field. The existing AI pipeline runs unchanged either way.

The starter templates are defined as a constant in `types/index.ts` alongside `GOAL_CATEGORY_CONFIG`. They persist as a reusable constant — out of scope for this spec, but could be surfaced in the normal (non-onboarding) wizard later.

**Coaching tooltips** — a new `<Tooltip />` primitive renders once on each wizard step when `onboardingMode` is on:

| Step | Tooltip copy |
|------|--------------|
| `goal-input` | "Describe your goal like you'd say it to a friend. Dr. Sage turns this into daily habits." |
| `context` | "These questions shape the habits Dr. Sage suggests. Be honest — no wrong answers." |
| `generating` | *No tooltip — replaced by Dr. Sage narration (see below).* |
| `review` | "These are your daily moves. Tap ✕ to remove any that don't fit — you can tweak later." |
| `creating` | *No tooltip — too fast to read.* |
| `confirmation` | *No tooltip — replaced by CTA swap (see below).* |

**Dr. Sage narration on the `generating` step** — the biggest single UX upgrade. Instead of a generic loading state, render a chat-bubble stack that animates in one line at a time while the AI generates. Lines are scripted (not LLM-generated) for speed and reliability. Example script:

1. "Looking at what you said…"
2. "Picking habits that fit your energy…"
3. "Building a plan for week one…"
4. "Almost there."

Lines cycle on a fixed timer independent of the actual generation duration. If generation finishes before all lines play, the sequence is cut short. If generation takes longer than the script, the last line loops. Bubbles use the same visual style as the Dr. Sage chat in the existing companion screen to establish visual continuity.

**Confirmation CTA swap** — in onboarding mode, the final `confirmation` step's primary CTA changes from "View goal" to "See today's habits →". Tapping dismisses the wizard and returns the user to `app/onboarding.tsx`, which then advances to step 4.

### Dr. Sage as a hero (steps 3–5)

Three touchpoints establish Dr. Sage as a character rather than a chatbot:

1. **`generating` narration (step 3)** — Sage describes the work being done.
2. **XP toast on first habit complete (step 4)** — `XpToast` gains an optional secondary line attributed to Sage. For the first-ever habit completion, the toast renders: `+10 XP · "Nice. That's rep one." — Sage`. Subsequent completions show the normal toast.
3. **Bottom-sheet intro (step 5)** — immediately after the XP toast animation resolves, a `BottomSheet` slides up with Sage's avatar and a short introduction. Single CTA: "Got it." Dismissing persists `onboarding.sageIntroShown = true` in `AsyncStorage`.

### Narrative empty states

Every tab or secondary screen that can be in a zero-data state gets a standardized empty state. Pattern:

```
[icon]
[What it is — one sentence, bold]
[How it connects — one sentence mentioning another feature by name]
[Primary action button]
```

The "how it connects" line is load-bearing. That sentence is what teaches the mental model.

Target screens:

| Screen | Icon | Title | Connection | Action |
|--------|------|-------|------------|--------|
| Dashboard | 🏠 | Your daily home base | "Set up your first **Goal** and Dr. Sage will build habits for you." | Create your first goal |
| Chronicles | 📓 | Your journal, just for you | "**Dr. Sage** reads entries privately and spots patterns you might miss." | Write your first entry |
| Insights | 📊 | Patterns appear here | "After a week of **Habit** completions and **Chronicle** entries, we'll surface trends." | — (waits on data) |
| Quests | ⚔️ | Multi-day missions | "Quests are tied to your **Goals** and unlock as you build streaks." | (progress bar: 0 of 3 days) |
| Medicines | 💊 | Track meds & supplements | "Each completion builds **HP** and keeps you safe from the Underworld." | Add a medicine |
| Goals | 🎯 | Your reasons | "Goals are the why behind your daily **Habits**. Dr. Sage builds the plan." | Create your first goal |
| Companion | 🧙‍♂️ | Talk to Dr. Sage anytime | "Sage remembers context from your **Chronicles** and habit history." | Say hi |

Implementation: update `components/ui/EmptyState.tsx` to support this pattern (icon + title + connection paragraph + CTA). If the component already supports these fields, no change needed — just updated usage across screens.

The Quests empty state uses a **progress-toward-unlock** variant: instead of a CTA, it shows a progress bar ("0 of 3 days until your first Quest unlocks"). Strongest motivating pattern for gated features; used by Duolingo, Finch, and Habitica.

### New UI primitives

Two small components added to `components/ui/`:

- **`Coachmark.tsx`** (~150 lines). A portal-rendered overlay that dims the screen, cuts out a spotlight around a target element's bounds, and renders a tooltip bubble with an arrow pointing at the target. Dismissed by tapping outside or an ✕ button. Used exactly once in this spec (step 4). Built on Reanimated for the entry/exit animations.
- **`Tooltip.tsx`** (~60 lines). A simple styled bubble with an arrow, positioned above or below its target. Used inside `AddGoalWizard` for per-step coaching tooltips. Dismissible. Tracks "seen" state per tooltip ID in `AsyncStorage` so it renders once per device.

No third-party library is used. Rationale: HabitQuest already has the design system primitives (BottomSheet, Button, EmptyState, XpToast, theme, haptics, Reanimated). A library would fight the theme and add bundle weight for two small components.

### Skippability matrix

| Step | Skip control | What happens |
|------|--------------|--------------|
| 1. Welcome slides | "Skip" top-right | Jump to dashboard. Banner ("Create your first goal →") + narrative empty state teach by themselves. |
| 2. ND personalisation | Existing "Skip" | Proceed with no ND profile. Sage generates generic habits. Unchanged. |
| 3a. Template picker | "Type my own →" | Alternate route, same flow — not really a skip. |
| 3b. Wizard (any step) | "Skip for now" | Abort wizard. Dashboard with banner. Banner tap reopens wizard in normal mode. |
| 4. Habit coachmark | Tap outside / ✕ | Dismiss spotlight. Habits stay on-screen and tappable. |
| 5. Sage intro | Swipe down / "Got it" | Dismiss bottom sheet. Sage icon remains in nav for later discovery. |

Design principle: skipping is always safe and always leaves the user in a state where the next action is visible.

### Re-entry

Three mechanisms for users who skipped or want to revisit:

1. **Settings → "Take the tour again"** — a new menu item that replays the welcome slides only (not the wizard, since the user already has data). Good for users who skipped slides initially and want to revisit the mental-model explainer.
2. **Dashboard banner** — a persistent, non-dismissible "Create your first goal →" banner shown while `firstGoalCreatedAt` is `undefined`. Disappears automatically once the user creates a goal by any means.
3. **Narrative empty states** — the primary long-term re-entry mechanism. Every tab with no data re-teaches its feature every time it's visited. No "seen it" tracking.

### Schema changes

Add one optional field to the `users` table in `convex/schema.ts`:

```ts
firstGoalCreatedAt: v.optional(v.number()),
```

Set by an existing goal-creation path in `convex/goals.ts` (on first create only — if the field is already populated, leave it). Used only by the dashboard banner's visibility check. No separate mutation required.

### Analytics events

Added to `lib/analytics/` alongside the existing `onboarding_completed` event. All events use the existing `useAnalytics()` hook.

| Event | Payload | When fired |
|-------|---------|------------|
| `onboarding_step_viewed` | `{ step: 'slides' \| 'nd' \| 'template' \| 'wizard' \| 'coachmark' \| 'sage' }` | When user arrives at each step. |
| `onboarding_step_skipped` | `{ step, elapsedMs }` | When user taps skip/abort at any step. |
| `onboarding_template_selected` | `{ templateId: GoalCategory \| 'custom' }` | When user picks a template tile or "type my own." |
| `onboarding_wizard_completed` | `{ goalId, habitCount, durationMs }` | When `AddGoalWizard` reaches `confirmation` in onboarding mode. |
| `onboarding_first_habit_completed` | `{ fromCoachmark: boolean }` | When the user's first-ever habit completion fires. |
| `onboarding_sage_dismissed` | `{ interacted: boolean }` | When the Sage bottom sheet is dismissed. |

Post-launch, the drop-off between any two adjacent events is the primary signal. Drops at `onboarding_wizard_completed` signal AI generation anxiety or slowness. Drops at `onboarding_first_habit_completed` signal coachmark failure.

### State management

- **Convex users table:** `firstGoalCreatedAt` (new, optional). The existing `onboardingCompleted` flag still represents completion of the slides/ND step.
- **AsyncStorage (local, per-device):**
  - `onboarding.coachmarkShown` — boolean, prevents re-showing the habit coachmark.
  - `onboarding.sageIntroShown` — boolean, prevents re-showing the Sage bottom sheet.
  - `tooltip.seen.<id>` — one key per tooltip ID.

No cross-device sync needed for these — they're UX affordances, not data.

### i18n

New strings added to `locales/en/*.json` and `locales/zh/*.json`:

- Onboarding slide copy (2 slides × ~20 words each)
- Wizard tooltip copy (4 tooltips, ~15 words each)
- Starter template tiles (6 tiles × label + subtitle + prefillText)
- Dr. Sage narration script (4 lines for generating step, 1 line for XP toast, 1 paragraph for bottom-sheet intro)
- Dashboard banner copy ("Create your first goal →" + dismiss not shown)
- Settings re-entry label ("Take the tour again")
- 7 narrative empty states (title + connection paragraph + CTA each)

Approximate scope: ~50 new i18n keys × 2 languages = 100 new entries.

## Implementation order

Suggested phasing so the team can ship value at each step rather than wait for a big-bang release:

1. **Foundation — empty states (lowest risk).** Update `EmptyState.tsx` to support the three-field narrative pattern if needed. Rewrite all 7 target screens to use it. Add i18n keys. This alone is a meaningful upgrade — the app teaches itself better even without the other changes.
2. **New primitives.** Build `Tooltip.tsx` and `Coachmark.tsx`. No feature integration yet.
3. **Wizard onboarding mode.** Add `onboardingMode` prop to `AddGoalWizard`. Build the starter-template pre-step. Wire tooltips on each step.
4. **Dr. Sage narration.** Add the chat-bubble animation to the `generating` step when `onboardingMode` is true.
5. **Onboarding screen rewire.** Update `app/onboarding.tsx` to slim slides from 3 to 2, wire the wizard as a step after ND, then transition to dashboard with the coachmark.
6. **Step 4 + 5 hero moments.** Extend `XpToast` with the Sage attribution line (first-habit-only). Build the Sage bottom-sheet intro.
7. **Analytics.** Instrument all six new events throughout the flow.
8. **Settings re-entry.** Add "Take the tour again" link.
9. **Schema & banner.** Add `firstGoalCreatedAt` field. Set it in the existing goal-creation path. Wire the dashboard banner.

## Open questions

1. **Starter templates outside onboarding.** Proposed: keep them onboarding-only for now, since the existing wizard's free-text input works well for returning users who already have goals in mind. Can be surfaced later if analytics show new goals stalling at `goal-input`.
2. **Generating-step narration — scripted vs. LLM.** Proposed: scripted. Faster, cheaper, no LLM-dependency latency during onboarding, and users don't inspect the copy.
3. **Should the slides be trimmed to 1 slide instead of 2?** Proposed: 2. The first is value prop (hook), the second is the mental-model diagram (the thing this whole spec exists to teach). Cutting to 1 loses the setup for step 3.

## Testing

- Unit tests: `EmptyState` variant rendering, `Coachmark` visibility/dismiss logic, `Tooltip` one-per-id behaviour.
- Manual: full first-run flow on iOS and Android. Skip at each step. Re-open via Settings. Create a goal both via template and free-text paths. Confirm empty states render on every target screen.
- No automated end-to-end tests (consistent with current project practice).

## Out of scope / follow-ups

- First-week checklist on dashboard (option C from brainstorming).
- Just-in-time coachmarks across advanced features (Quests, Medicines, Insights).
- Tutorial videos or animated explainers.
- A/B test framework for onboarding variants.
