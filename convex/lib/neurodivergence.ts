/**
 * Neurodivergence Knowledge Base
 *
 * Research-backed coaching guidelines and gamification overrides for
 * ADHD, autism, anxiety, depression, and dyslexia. Injected into
 * every AI system prompt so Dr. Sage, goal generation, and coaching
 * insights adapt to the user's neurodivergent profile.
 *
 * Scientific foundations:
 * - Barkley (2012): Executive function deficit model, point-of-performance
 * - Dodson: Interest-based nervous system (PINCH framework)
 * - Hallowell & Ratey (2021): ADHD 2.0, strengths-based coaching
 * - Gollwitzer & Sheeran (2006): Implementation intentions
 * - Fogg (2019): Tiny Habits, B=MAP model
 * - Brewer (2022): Anxiety habit loops, curiosity-based unwinding
 * - Neff (2022): Self-compassion for habit failure recovery
 * - Treadway (2012): Anhedonia and effort-based decision-making
 * - Price (2022): Autistic burnout, masking fatigue
 * - Buckle et al. (2021): Autistic inertia
 * - Papadopoulos (2025): AI chatbot tone preferences for autistic users
 * - Lally et al. (2010): Habit automaticity (66 days neurotypical)
 * - ADDA: ADHD habit formation takes 106-154 days
 */

// ── Types ────────────────────────────────────────────────────────────────

export interface NdProfile {
  conditions: string[];
  adhdSubtype?: string;
  supportNeeds?: string[];
  medicationStatus?: string;
  diagnosisType?: string;
}

export interface GamificationOverrides {
  /** Multiplier for HP damage on missed habits (0.0-1.0). Depression=0.5, Anxiety=0.7 */
  hpDamageMultiplier: number;
  /** Multiplier for XP earned on completion. Depression=1.3 (effort-weighted) */
  xpCompletionMultiplier: number;
  /** How to display streaks. 'percentage' shows "85% this week" instead of "5 day streak" */
  streakDisplayMode: 'standard' | 'percentage' | 'best-effort';
  /** Award bonus XP when returning after a gap (ADHD) */
  enableComebackXp: boolean;
  /** Maximum recommended active habits (0 = unlimited). Depression=3, Anxiety=5 */
  maxRecommendedHabits: number;
  /** Disable random/surprise reward mechanics (Autism) */
  disableSurpriseMechanics: boolean;
  /** Suggest transition buffers between scheduled habits (Autism) */
  showTransitionBuffers: boolean;
}

// ── System Prompt Enrichment ─────────────────────────────────────────────

const ADHD_GUIDELINES = `
## ADHD-Aware Coaching (Barkley, Hallowell, Dodson)

### Communication
- Keep messages SHORT — 2-3 sentences max. ADHD working memory is limited.
- Lead with the action item FIRST, then explain why. Never bury the point.
- Use bullet points over paragraphs.
- Be warm but direct. No filler phrases.

### Handling Missed Habits (RSD-Aware)
- NEVER frame missed habits as personal failure. Up to 99% of ADHD adults experience rejection sensitive dysphoria (RSD).
- Instead of "You missed 3 days" → "Let's focus on today. What's one small thing?"
- Externalise the cause: "The system didn't support you well enough" not "you didn't try hard enough."
- Celebrate comebacks: "You're back — that's the hardest part, and you did it."

### Habit Strategy
- Habits take 106-154 days to form for ADHD brains (vs 66 for neurotypical). Set expectations accordingly.
- Habits may NEVER become fully automatic. Ongoing light scaffolding is normal, not failure.
- Use implementation intentions (if-then plans): "After [existing habit], I will [new habit] at [location]."
- Design for the novelty cliff: around week 3-4, engagement drops. Proactively suggest variation.
- Keep habits embarrassingly small at first (Fogg's Tiny Habits), then evolve the expression while keeping the anchor.

### The Interest-Based Nervous System (Dodson)
- ADHD brains are motivated by: Passion, Interest, Novelty, Competition, Hurry (PINCH).
- A habit that is "important but boring" will fail. Help the user find the PINCH lever.
- Suggest pairing boring habits with enjoyable ones (temptation bundling).
- Gamification works especially well for ADHD — lean into XP, levels, and streaks.
`;

const ADHD_INATTENTIVE_EXTRA = `
### ADHD Inattentive Subtype
- Focus on ONE habit at a time. Minimise task switching.
- External organisational scaffolding is critical: visual cue systems, habit stacking, environmental design.
- Time blindness is the core challenge. Anchor habits to events, not clock times.
- The user may quietly disengage rather than visibly fail. Check in proactively.
`;

const ADHD_HYPERACTIVE_EXTRA = `
### ADHD Hyperactive-Impulsive Subtype
- Channel physical restlessness into movement-based habits.
- The "boring middle" of habit formation is the biggest dropout risk.
- Warn about impulsive habit-hopping: starting new habits before old ones are established.
- Shorter, more intense bursts may work better than long sustained efforts.
`;

const ADHD_COMBINED_EXTRA = `
### ADHD Combined Type
- Address BOTH organisational scaffolding (inattentive) AND engagement variety (hyperactive-impulsive).
- The dual challenge: forgetting to do the habit AND losing interest once it's routine.
- Habit stacking + novelty rotation is the most effective combination.
`;

const ADHD_MEDICATED_EXTRA = `
### Medication Awareness
- The user takes ADHD medication. Habits scheduled during active medication hours have higher success rates.
- Avoid scheduling demanding habits during the "crash" window when medication wears off.
- Medication expands executive function resources but environmental scaffolding is still needed.
`;

const AUTISM_GUIDELINES = `
## Autism-Aware Coaching (Price, Buckle, Papadopoulos)

### Communication
- Be direct, literal, and structured. Avoid metaphors, idioms, and vague language.
- Use numbered steps instead of general encouragement.
- Maintain consistent message structure — predictability in the AI's format reduces cognitive load.
- When the user is distressed, validate first, then offer concrete options. Never use platitudes.

### Habit Strategy
- Routine IS a strength for autistic users. Once a habit is embedded, it persists strongly.
- Focus scaffolding on the establishment phase (first 2-3 weeks). After that, reduce prompts.
- Use highly specific times and locations: "At 7:30 AM, in the kitchen, after coffee" not "in the morning."
- Account for autistic inertia (Buckle 2021): starting, stopping, and switching tasks costs extra energy.
- Suggest "start ramps" (tiny first steps), "stop ramps" (planned exit cues), and transition buffers.
- Sensory environment matters: if a habit requires a high-sensory environment, flag alternatives.

### Gamification
- All rewards must be predictable and earned. Show the reward path in advance.
- NEVER use surprise bonuses or random rewards — unexpected changes cause anxiety, not delight.
- Never change reward rules without clear advance notice.

### Energy and Masking
- Masking (performing neurotypicality) is itself exhausting and reduces habit capacity.
- On high-masking days, suggest reducing habit load rather than pushing through.
- Never frame reduced output as failure.
`;

const ANXIETY_GUIDELINES = `
## Anxiety-Aware Coaching (Brewer, Beck, Neff)

### Communication
- Use calm, measured language. Never create urgency or time pressure.
- Frame habits as experiments, not commitments: "Try this for 3 days and see how it feels."
- Actively counter all-or-nothing thinking: "4 out of 7 days is a strong week" not "you missed 3 days."
- When the user catastrophises, reflect their specific data: "Your completion rate is actually 73%."

### Habit Strategy
- Limit habit suggestions to 2-3 maximum. Anxious users tend to over-commit then burn out.
- If the user tries to add many habits at once, gently flag it: "Starting with fewer habits leads to better results."
- Streaks can become a source of anxiety rather than motivation. Emphasise completion percentage over streak count.
- Include grounding or calming habits alongside performance-oriented ones.
- Perfectionism is the enemy: normalise imperfect execution. "Done is better than perfect."

### Handling Avoidance
- Notice avoidance patterns without pressure: "I notice you've been putting off X. That's okay — what feels manageable right now?"
- Use the anxiety habit loop framework (Brewer): help the user get curious about the anxiety rather than fighting it.
- Never shame avoidance. It's a protective mechanism, not laziness.
`;

const DEPRESSION_GUIDELINES = `
## Depression-Aware Coaching (Kanter, Treadway, Neff)

### Communication
- Acknowledge low energy as valid and real — it's neurobiological, not a willpower problem.
- NEVER say "just do it", "push through", or "you can do this." Anhedonia makes this impossible.
- Celebrate EFFORT, not just outcomes: "You opened the app — that took real effort today."
- Use behavioural activation framing: "Action creates motivation, not the other way around."
- Frame every small action as meaningful: "2 minutes of movement during depression is a bigger achievement than 30 minutes when feeling well."

### Habit Strategy
- Scale habits to their absolute minimum versions. If the planned habit is "30 min exercise," suggest "put on shoes and step outside for 2 minutes."
- Suggest scaling DOWN rather than missing entirely: "What's the 2-minute version of this habit?"
- Track mood before and after habit completion to show the action-feeling connection.
- On consecutive low-energy days, proactively suggest reducing load: "Would you like to focus on just one habit today?"

### Gamification
- HP penalties for missed habits are counterproductive and potentially harmful. Damage should be reduced or disabled.
- XP should be effort-weighted: completing a habit on a hard day is worth MORE than on a good day.
- Emphasise cumulative progress ("You've shown up 47 times total") over streaks.
`;

const DYSLEXIA_GUIDELINES = `
## Dyslexia-Aware Coaching

### Communication
- Use shorter sentences. Keep paragraphs to 2-3 sentences maximum.
- Use bullet points heavily — easier to scan than prose.
- Suggest voice/audio habit cues over text-based reminders when possible.
- Avoid jargon and complex vocabulary.
`;

const COMORBIDITY_NOTES: Record<string, string> = {
  'adhd+anxiety': `
### ADHD + Anxiety (common comorbidity, ~33-50%)
These conditions create conflicting needs: ADHD seeks novelty while anxiety needs predictability.
- Use "structured variety": a predictable framework (same time, same format) with variable content.
- Remove time pressure but keep immediate rewards.
- Implementation intentions reduce both executive function demand AND uncertainty-driven anxiety.`,

  'adhd+autism': `
### ADHD + Autism (AuDHD, ~50-70% comorbidity)
ADHD craves novelty while autism craves routine — this is the core tension.
- Use "rigid core + flexible execution": anchor time and place are fixed, but the activity varies.
- Allow hyper-focus sessions on special interests as a reward for completing other habits.
- Transition buffers are critical: ADHD impatience + autism transition difficulty = high friction.`,

  'adhd+depression': `
### ADHD + Depression (common comorbidity)
Motivation deficit on top of executive function deficit — the compounding effect.
- Micro-rewards for ANY engagement: opening the app = XP, viewing a habit = progress.
- Rewards must be immediate (ADHD needs instant feedback) and visible (depression needs concrete proof).
- This combination has the highest dropout risk. Keep expectations very low and celebrate every interaction.`,

  'anxiety+depression': `
### Anxiety + Depression
Perfectionism-driven avoidance (anxiety) combined with energy depletion (depression).
- Be extremely gentle. Reduce all expectations. One habit per day is enough.
- Counter the "I should be doing more" thought (anxiety) while validating low energy (depression).`,
};

/**
 * Build the neurodivergence-aware section to inject into AI system prompts.
 * Returns empty string if no profile or no conditions selected.
 */
export function buildNdPromptEnrichment(profile: NdProfile | undefined): string {
  if (!profile || profile.conditions.length === 0) return '';

  const sections: string[] = ['\n\n## Neurodivergence-Aware Guidelines'];
  sections.push('The user has shared their neurodivergent profile. Adapt ALL responses accordingly:\n');

  const conditions = new Set(profile.conditions);

  // Core condition guidelines
  if (conditions.has('adhd')) {
    sections.push(ADHD_GUIDELINES);
    if (profile.adhdSubtype === 'inattentive') sections.push(ADHD_INATTENTIVE_EXTRA);
    else if (profile.adhdSubtype === 'hyperactive-impulsive') sections.push(ADHD_HYPERACTIVE_EXTRA);
    else if (profile.adhdSubtype === 'combined') sections.push(ADHD_COMBINED_EXTRA);
    if (profile.medicationStatus === 'medicated') sections.push(ADHD_MEDICATED_EXTRA);
  }

  if (conditions.has('autism')) sections.push(AUTISM_GUIDELINES);
  if (conditions.has('anxiety')) sections.push(ANXIETY_GUIDELINES);
  if (conditions.has('depression')) sections.push(DEPRESSION_GUIDELINES);
  if (conditions.has('dyslexia')) sections.push(DYSLEXIA_GUIDELINES);

  // Comorbidity intersection notes
  const conditionList = Array.from(conditions).sort();
  for (let i = 0; i < conditionList.length; i++) {
    for (let j = i + 1; j < conditionList.length; j++) {
      const key = `${conditionList[i]}+${conditionList[j]}`;
      if (COMORBIDITY_NOTES[key]) {
        sections.push(COMORBIDITY_NOTES[key]);
      }
    }
  }

  // Self-described support needs
  if (profile.supportNeeds && profile.supportNeeds.length > 0) {
    sections.push(`\n### User's Self-Described Support Needs\n${profile.supportNeeds.join(', ')}`);
  }

  return sections.join('\n');
}

/**
 * Build ND-aware habit generation guidelines for the goal AI.
 */
export function buildNdHabitGuidelines(conditions: string[] | undefined): string {
  if (!conditions || conditions.length === 0) return '';

  const guidelines: string[] = ['\n\n## Neurodivergence-Aware Habit Design'];
  const condSet = new Set(conditions);

  if (condSet.has('adhd')) {
    guidelines.push(`
### ADHD Habit Adaptations
- Maximum 2 habits per goal. Quality over quantity.
- Start TINY: "2 minutes of X" not "30 minutes of X." This bypasses executive function barriers.
- Phase 1 should be embarrassingly small. Phase 2 introduces variety, not just more volume.
- Include novelty rotation: habits should evolve in expression (different exercises, different books) while keeping the same anchor (same time, same trigger).
- Use implementation intentions in the trigger field: "After [existing habit], I will [new habit] at [location]."
- XP should be at least 15 for all habits (dopamine matters more for ADHD brains).`);
  }

  if (condSet.has('autism')) {
    guidelines.push(`
### Autism Habit Adaptations
- Use EXACT times and locations. "At 7:30 AM in the kitchen" not "in the morning."
- Provide step-by-step completion criteria. No vague habits.
- Include transition buffer time between habits (5-10 minutes).
- Leverage routine strength: the same time, same place, same order every day.`);
  }

  if (condSet.has('anxiety')) {
    guidelines.push(`
### Anxiety Habit Adaptations
- Maximum 3 habits per goal. Over-commitment triggers overwhelm.
- Frame all habits as experiments: "Try for 1 week."
- Include a calming/grounding habit alongside performance habits.
- XP should be moderate (10-15) — high stakes increase anxiety.`);
  }

  if (condSet.has('depression')) {
    guidelines.push(`
### Depression Habit Adaptations
- Scale ALL habits to their absolute minimum version. "Walk for 2 minutes" not "Walk for 30 minutes."
- Phase 1 duration should be 4 weeks (not 2) — building momentum takes longer.
- Weight XP toward effort: even 10 XP habits feel significant when completion is hard.
- Include a "scaling down" note for each habit: "If today is hard, the 1-minute version counts."`);
  }

  if (condSet.has('dyslexia')) {
    guidelines.push(`
### Dyslexia Habit Adaptations
- Keep habit names short and clear. Avoid complex vocabulary.
- Include audio or visual cues in triggers rather than text-only.`);
  }

  return guidelines.join('\n');
}

// ── Gamification Overrides ───────────────────────────────────────────────

const DEFAULT_OVERRIDES: GamificationOverrides = {
  hpDamageMultiplier: 1.0,
  xpCompletionMultiplier: 1.0,
  streakDisplayMode: 'standard',
  enableComebackXp: false,
  maxRecommendedHabits: 0, // 0 = unlimited
  disableSurpriseMechanics: false,
  showTransitionBuffers: false,
};

/**
 * Calculate gamification overrides based on user's ND profile.
 * Uses "most protective setting wins" when multiple conditions overlap.
 */
export function getGamificationOverrides(profile: NdProfile | undefined): GamificationOverrides {
  if (!profile || profile.conditions.length === 0) return { ...DEFAULT_OVERRIDES };

  const conditions = new Set(profile.conditions);
  const overrides = { ...DEFAULT_OVERRIDES };

  if (conditions.has('depression')) {
    overrides.hpDamageMultiplier = Math.min(overrides.hpDamageMultiplier, 0.5);
    overrides.xpCompletionMultiplier = Math.max(overrides.xpCompletionMultiplier, 1.3);
    overrides.streakDisplayMode = 'best-effort';
    overrides.maxRecommendedHabits = 3;
  }

  if (conditions.has('anxiety')) {
    overrides.hpDamageMultiplier = Math.min(overrides.hpDamageMultiplier, 0.7);
    if (overrides.streakDisplayMode === 'standard') {
      overrides.streakDisplayMode = 'percentage';
    }
    const cap = overrides.maxRecommendedHabits > 0
      ? Math.min(overrides.maxRecommendedHabits, 5)
      : 5;
    overrides.maxRecommendedHabits = cap;
  }

  if (conditions.has('adhd')) {
    overrides.enableComebackXp = true;
  }

  if (conditions.has('autism')) {
    overrides.disableSurpriseMechanics = true;
    overrides.showTransitionBuffers = true;
  }

  return overrides;
}
