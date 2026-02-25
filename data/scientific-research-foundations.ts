/**
 * SCIENTIFIC RESEARCH FOUNDATIONS FOR HABITQUEST
 *
 * Comprehensive literature review of habit formation, behavior change, and
 * habit maintenance science. Each section contains researcher attribution,
 * year, key findings, and actionable app feature implications.
 *
 * Compiled: 2026-02-25
 */

// =============================================================================
// 1. HABIT FORMATION SCIENCE
// =============================================================================

export const HABIT_FORMATION_SCIENCE = {

  // ---------------------------------------------------------------------------
  // 1A. Phillippa Lally - UCL Automaticity Study
  // ---------------------------------------------------------------------------
  lallyAutomaticity: {
    researcher: "Phillippa Lally, Cornelia H.M. van Jaarsveld, Henry W.W. Potts, Jane Wardle",
    institution: "University College London (UCL), Cancer Research UK Health Behaviour Research Centre",
    year: 2009,
    publication: "European Journal of Social Psychology, 40(6), 998-1009",
    title: "How are habits formed: Modelling habit formation in the real world",
    methodology: `96 volunteers chose an eating, drinking, or activity behavior to carry out
daily in the same context (e.g., "after breakfast") for 12 weeks. They completed the
Self-Report Habit Index (SRHI) each day. Nonlinear regressions fitted an asymptotic curve
to each individual's automaticity scores over 84 days.`,
    keyFindings: [
      "Average time to reach 95% of asymptote of automaticity: 66 days",
      "Range was enormous: 18 to 254 days across participants",
      "Missing ONE opportunity to perform the behavior did NOT materially affect habit formation",
      "More complex behaviors took longer to become automatic",
      "Simple drinking habits formed fastest; exercise habits took longest",
      "Automaticity follows a curved (asymptotic) pattern, not linear - early repetitions matter most",
    ],
    appFeatureImplications: [
      "FEATURE: Dynamic habit maturity indicator showing asymptotic progress curve, not linear bar",
      "FEATURE: 66-day default milestone, but communicate the 18-254 day range to set realistic expectations",
      "FEATURE: 'Missed one? No problem!' messaging when streaks break - backed by Lally's finding that single misses don't derail habit formation",
      "FEATURE: Difficulty-adjusted timelines - exercise habits get longer projected timelines than simple habits",
      "FEATURE: 'Automaticity score' that accelerates early (showing momentum) then plateaus (showing mastery)",
    ],
  },

  // ---------------------------------------------------------------------------
  // 1B. BJ Fogg - Tiny Habits / Behavior Model (B = MAP)
  // ---------------------------------------------------------------------------
  foggBehaviorModel: {
    researcher: "BJ Fogg, PhD",
    institution: "Stanford Behavior Design Lab",
    year: 2019, // Book: Tiny Habits; model originally published 2009 at Persuasive Technology conference
    publication: "Tiny Habits: The Small Changes That Change Everything (Houghton Mifflin Harcourt)",
    title: "Fogg Behavior Model: B = MAP (Behavior = Motivation x Ability x Prompt)",
    keyFindings: [
      "Behavior occurs ONLY when Motivation, Ability, and Prompt converge simultaneously",
      "If any one element is missing or too weak, the behavior will NOT occur",
      "Motivation and Ability can TRADE OFF: low motivation requires high ability (easy task), and vice versa",
      "Start with behaviors so tiny they require almost zero motivation ('floss one tooth')",
      "Anchor new behaviors to existing routines (the 'anchor moment')",
      "Celebrate immediately after the behavior to create positive emotions that wire the habit",
      "Three types of Prompts: Facilitator (helps low-ability users), Signal (neutral reminder), Spark (motivates low-motivation users)",
      "Key insight: 'Emotions create habits' - not repetition count. If you feel good about an action, it wires faster",
    ],
    appFeatureImplications: [
      "FEATURE: 'Tiny version' mode - let users define the absolute minimum version of each habit (2 pushups, not 50)",
      "FEATURE: Prompt type selection - users choose Facilitator/Signal/Spark based on their context",
      "FEATURE: Built-in celebration prompts immediately after habit check-in ('Nice! You did it!')",
      "FEATURE: Anchor habit selector - 'After I [existing habit], I will [new habit]'",
      "FEATURE: Ability assessment - if user keeps missing, suggest making the habit smaller, not adding more motivation",
      "FEATURE: MAP diagnostic - when a habit is struggling, help user identify which element is weak (M, A, or P)",
    ],
  },

  // ---------------------------------------------------------------------------
  // 1C. Charles Duhigg - The Habit Loop
  // ---------------------------------------------------------------------------
  duhiggHabitLoop: {
    researcher: "Charles Duhigg",
    year: 2012,
    publication: "The Power of Habit: Why We Do What We Do in Life and Business (Random House)",
    title: "The Habit Loop and the Golden Rule of Habit Change",
    keyFindings: [
      "Habits consist of a three-part loop: CUE -> ROUTINE -> REWARD",
      "Up to 40% of daily actions are habitual, not conscious decisions",
      "The basal ganglia stores habits as 'chunks' of behavior, allowing complex tasks without thinking",
      "The Golden Rule of Habit Change: keep the same cue, keep the same reward, change the routine",
      "Keystone habits: some habits trigger cascade effects that change other behaviors (e.g., exercise improves eating)",
      "Belief is essential: individuals who don't believe in change will likely give up",
      "Habit change is most effective in community (belief strengthens in groups)",
    ],
    appFeatureImplications: [
      "FEATURE: Habit loop builder - users define their Cue, Routine, and Reward for each habit",
      "FEATURE: 'Keystone habit' designation - highlight habits that cascade to other improvements",
      "FEATURE: Routine swap tool - when breaking a bad habit, help user design alternative routine with same cue/reward",
      "FEATURE: Community/group features to strengthen belief in change",
      "FEATURE: Cue identification prompts - help users discover what actually triggers their behaviors",
    ],
  },

  // ---------------------------------------------------------------------------
  // 1D. Wendy Wood - Context, Automaticity, and Environment
  // ---------------------------------------------------------------------------
  woodContextAutomaticity: {
    researcher: "Wendy Wood, PhD",
    institution: "University of Southern California",
    year: 2019, // Book publication; research spans decades
    publication: "Good Habits, Bad Habits: The Science of Making Positive Changes That Stick (Farrar, Straus and Giroux)",
    relatedPapers: [
      "Wood & Neal (2007). A new look at habits and the habit-goal interface. Psychological Review, 114(4), 843-863",
      "Wood, Quinn & Kashy (2002). Habits in everyday life. Journal of Personality and Social Psychology, 83(6), 1281-1297",
    ],
    keyFindings: [
      "About 43% of daily behavior is repeated in the same context, often while thinking about something else",
      "Habits are NOT goal-driven once formed - they are context-triggered automatic responses",
      "Three forces of habit: CONTEXT CUES, REPETITION, and REWARD",
      "Dopamine binds together the context and response when rewarded, forming the neural habit trace",
      "FRICTION is the most powerful habit disruption tool - even small friction stops habits (e.g., moving TV remote)",
      "Reducing friction for desired behaviors is more effective than increasing motivation",
      "When people move to new environments (college, new job), habits break because context cues change",
      "Strong habits are triggered by context cues and are relatively unaffected by current goals",
      "Performance contexts activate habitual behavior directly, without requiring a mediating goal",
    ],
    appFeatureImplications: [
      "FEATURE: Context-based reminders tied to location, time-of-day, or preceding activity - not arbitrary alarm times",
      "FEATURE: 'Friction audit' tool - help users identify and remove friction for good habits, add friction for bad ones",
      "FEATURE: Environment design prompts - suggest physical environment changes (lay out gym clothes, remove junk food)",
      "FEATURE: 'Life transition' detection - when user moves or changes schedule, proactively help rebuild habit contexts",
      "FEATURE: Context consistency tracker - reward users for performing habits in the same context",
    ],
  },

  // ---------------------------------------------------------------------------
  // 1E. James Clear - Atomic Habits Framework
  // ---------------------------------------------------------------------------
  clearAtomicHabits: {
    researcher: "James Clear",
    year: 2018,
    publication: "Atomic Habits: An Easy & Proven Way to Build Good Habits & Break Bad Ones (Avery/Penguin)",
    title: "The Four Laws of Behavior Change + Identity-Based Habits",
    keyFindings: [
      "Four Laws of Behavior Change: Make it Obvious, Make it Attractive, Make it Easy, Make it Satisfying",
      "Inverses for breaking bad habits: Make it Invisible, Unattractive, Difficult, Unsatisfying",
      "1% improvement compounds: habits are the compound interest of self-improvement",
      "Habit stacking: 'After I [CURRENT HABIT], I will [NEW HABIT]'",
      "The Two-Minute Rule: scale down any habit to just two minutes to start",
      "Environment design > willpower: change your environment, not your motivation",
      "Plateau of Latent Potential: results lag behind effort; the 'Valley of Disappointment' causes most people to quit",
      "Decisive moments: a few key choices each day set the trajectory for dozens of subsequent behaviors",
    ],
    appFeatureImplications: [
      "FEATURE: Four Laws diagnostic checklist for each habit (is it obvious? attractive? easy? satisfying?)",
      "FEATURE: Two-Minute Rule mode - auto-suggest scaling habits down to 2 minutes",
      "FEATURE: 'Valley of Disappointment' visualization showing the Plateau of Latent Potential",
      "FEATURE: Compound growth visualization - show exponential curve of 1% daily improvements",
      "FEATURE: Decisive moments tracker - identify and highlight the 4-5 pivotal daily choices",
    ],
  },
} as const;

// =============================================================================
// 2. SELF-DETERMINATION THEORY (SDT)
// =============================================================================

export const SELF_DETERMINATION_THEORY = {
  researcher: "Edward L. Deci & Richard M. Ryan",
  institution: "University of Rochester",
  year: 2000, // Landmark paper; theory developed from 1970s onward
  publication: "Ryan & Deci (2000). Self-determination theory and the facilitation of intrinsic motivation, social development, and well-being. American Psychologist, 55(1), 68-78",
  additionalReference: "Ryan & Deci (2020). Intrinsic and extrinsic motivation from a self-determination theory perspective. Contemporary Educational Psychology, 61, 101860",

  threeBasicNeeds: {
    autonomy: {
      definition: "The need to feel volitional and self-endorsing of one's actions; the absence of external control",
      researchFindings: [
        "Dieters with autonomy support lost more weight and maintained it better (Williams et al., 1996)",
        "Autonomy-supportive contexts produce more internalized motivation",
        "Offering extrinsic rewards for intrinsically motivated behavior UNDERMINES intrinsic motivation (the 'overjustification effect')",
        "Perceived autonomy mediates the effect of choice on behavioral retention",
      ],
      appImplications: [
        "Let users CHOOSE their habits, goals, and methods - never force a prescribed path",
        "Avoid mandatory features or forced sequences",
        "Frame rewards as informational feedback, not controlling incentives",
        "Provide customization options for nearly everything (reminders, themes, metrics)",
      ],
    },
    competence: {
      definition: "The need to feel effective and capable of achieving desired outcomes",
      researchFindings: [
        "Positive feedback enhances intrinsic motivation; negative feedback diminishes it (Deci, 1971)",
        "Optimal challenge (not too easy, not too hard) maximizes competence satisfaction",
        "Competence needs are met through clear progress feedback and mastery experiences",
      ],
      appImplications: [
        "Progressive difficulty scaling - start easy, increase over time",
        "Clear progress metrics and milestone celebrations",
        "Skill-tree or level-up systems showing growing mastery",
        "Avoid punishing language for missed habits; reframe as learning opportunities",
      ],
    },
    relatedness: {
      definition: "The need to feel connected to and cared for by others",
      researchFindings: [
        "Social connection increases persistence in challenging behaviors",
        "Group activities satisfy relatedness and increase adherence",
        "Even minimal social presence (knowing others are doing the same thing) boosts motivation",
      ],
      appImplications: [
        "Community features, accountability partners, group challenges",
        "Social proof: 'X other users are working on this habit too'",
        "Shared milestones and group celebrations",
        "Option to share progress with trusted friends",
      ],
    },
  },

  motivationSpectrum: {
    description: "SDT defines motivation on a continuum from amotivation through extrinsic to intrinsic",
    levels: [
      { type: "Amotivation", description: "No intention to act", appStrategy: "Help user find personal meaning in the habit" },
      { type: "External Regulation", description: "Act to get reward or avoid punishment", appStrategy: "Useful for starting, but transition to internal motivation" },
      { type: "Introjected Regulation", description: "Act to avoid guilt/shame", appStrategy: "Acknowledge but help shift away from guilt-based motivation" },
      { type: "Identified Regulation", description: "Act because you value the outcome", appStrategy: "Connect habits to personal values and goals" },
      { type: "Integrated Regulation", description: "Act because it aligns with who you are", appStrategy: "Identity-based framing ('I am someone who...')" },
      { type: "Intrinsic Motivation", description: "Act because it is inherently enjoyable", appStrategy: "Maximize flow, curiosity, and enjoyment in the process" },
    ],
  },

  recentAppDesignResearch: {
    source: "Noorbergen et al. (2024). Designing for Sustained Motivation: A Review of Self-Determination Theory in Behaviour Change Technologies. Interacting with Computers (Oxford Academic)",
    findings: [
      "Only 15 of 76 screened studies explicitly applied SDT to app design",
      "SDT is more often used to optimize user ENGAGEMENT with the tech, rather than foster genuine BEHAVIOR CHANGE",
      "Most apps focus on intrinsic motivation while neglecting the wider spectrum of extrinsic motivational processes",
      "Design features addressing competence (data recording/analysis), autonomy (personalized goal-setting), and relatedness (messaging/sharing) showed best results",
    ],
  },
} as const;

// =============================================================================
// 3. IMPLEMENTATION INTENTIONS
// =============================================================================

export const IMPLEMENTATION_INTENTIONS = {
  researcher: "Peter M. Gollwitzer, PhD",
  institution: "New York University / University of Konstanz",
  year: 1999, // Seminal paper; research ongoing
  publications: [
    "Gollwitzer (1999). Implementation intentions: Strong effects of simple plans. American Psychologist, 54(7), 493-503",
    "Gollwitzer & Sheeran (2006). Implementation intentions and goal achievement: A meta-analysis of effects and processes. Advances in Experimental Social Psychology, 38, 69-119",
    "Keller et al. (2024). The when and how of planning: Meta-analysis of the scope and components of implementation intentions in 642 tests",
  ],

  coreConcept: `Implementation intentions are specific "if-then" plans that specify when, where,
and how one will act toward a goal. Format: "If [situation X occurs], then I will [perform behavior Y]."
They create a mental link between a situational cue and a planned response, delegating
behavioral control to the environment rather than relying on willpower.`,

  effectSizes: {
    originalMetaAnalysis: {
      year: 2006,
      sampleSize: "94 independent tests",
      effectSize: "d = 0.65 (medium-to-large)",
      finding: "Implementation intentions had a positive effect of medium-to-large magnitude on goal attainment",
    },
    expandedMetaAnalysis: {
      year: 2024,
      sampleSize: "642 independent tests",
      effectSizeRange: "0.27 <= d <= 0.66 for cognitive, affective, and behavioral outcomes",
      keyModerators: [
        "Effect sizes were LARGER when plans had a contingent (if-then) format vs. simple action plans",
        "Effect sizes were LARGER when participants were highly motivated to pursue the goal",
        "Effect sizes were LARGER when plans were rehearsed at least once",
      ],
    },
    domainSpecific: [
      { domain: "Anti-racist behaviors", effectSize: "d = 0.87" },
      { domain: "Prosocial behaviors", effectSize: "d = 1.01" },
      { domain: "Environmental behaviors", effectSize: "d = 1.12" },
      { domain: "Physical activity (university students)", effectSize: "Significant positive (meta-analysis 2023)" },
    ],
  },

  appFeatureImplications: [
    "FEATURE: If-then plan builder for each habit: 'If [time/location/event], then I will [specific action]'",
    "FEATURE: Obstacle anticipation: 'If [obstacle occurs], then I will [coping response]'",
    "FEATURE: Plan rehearsal prompts - ask users to mentally rehearse their if-then plan (shown to increase effect size)",
    "FEATURE: Pre-commitment check-in - 'What's your plan for [habit] today?'",
    "FEATURE: Context-specific reminders triggered by the 'if' condition (location, time, preceding event)",
    "FEATURE: Multiple if-then plans per habit covering different situations and obstacles",
  ],
} as const;

// =============================================================================
// 4. TEMPTATION BUNDLING
// =============================================================================

export const TEMPTATION_BUNDLING = {
  researcher: "Katherine (Katy) Milkman, PhD",
  institution: "Wharton School, University of Pennsylvania",
  year: 2014,
  publications: [
    "Milkman, Minson & Volpp (2014). Holding the Hunger Games hostage at the gym: An evaluation of temptation bundling. Management Science, 60(2), 283-299",
    "Milkman (2021). How to Change: The Science of Getting from Where You Are to Where You Want to Be (Portfolio/Penguin)",
    "Kirgios et al. (2020). Teaching temptation bundling to boost exercise: A field experiment. Organizational Behavior and Human Decision Processes, 161, 20-35",
  ],

  coreConcept: `Temptation bundling simultaneously addresses two self-control problems by pairing a
"want" activity (immediately gratifying) with a "should" activity (long-term beneficial).
The want activity becomes the reward for engaging in the should activity.`,

  keyFindings: [
    "Gym-only audiobook access group attended the gym 51% more than the control group",
    "Gym-only group attended 29% more than the group merely encouraged to self-restrict audiobooks to the gym",
    "Teaching people the concept of temptation bundling (without restricting access) also boosted exercise by a meaningful amount",
    "The effect size diminished over time as the novelty of the audiobook wore off, suggesting need for variety",
    "Works best when the 'want' and 'should' activities can be done simultaneously",
  ],

  appFeatureImplications: [
    "FEATURE: Temptation bundling creator - pair each habit with a specific indulgence ('Only listen to X podcast during runs')",
    "FEATURE: Bundling suggestions library - curated pairings for common habits",
    "FEATURE: Rotating bundle suggestions to combat novelty decay",
    "FEATURE: 'Bundle lock' option - app integrates with media apps to unlock content only when habit is in progress",
    "FEATURE: Educational module explaining the concept so users can self-apply it creatively",
  ],
} as const;

// =============================================================================
// 5. COMMITMENT DEVICES
// =============================================================================

export const COMMITMENT_DEVICES = {
  researchers: [
    "Dean Karlan, PhD (Yale) - stickK.com creator",
    "Gharad Bryan, Scott Nelson - theoretical frameworks",
    "Daniel Ariely - behavioral economics applications",
  ],
  year: 2008, // stickK launch; research spans years
  publications: [
    "Bryan, Karlan & Nelson (2010). Commitment devices. Annual Review of Economics, 2, 671-698",
    "Royer et al. (2015). Incentives, commitments, and habit formation in exercise. American Economic Journal: Applied Economics, 7(4), 1-27",
  ],

  coreConcept: `Commitment devices are voluntary arrangements in which an individual raises the cost
of their own future undesirable behavior to overcome the gap between short-term and long-term preferences.`,

  types: {
    financial: {
      description: "Put money at stake that is forfeited if goal is not met",
      findings: [
        "StickK users who set financial stakes had higher goal completion rates",
        "The greater the cost of breaking a commitment, the more effective it is",
        "Loss of money to a disliked cause ('anti-charity') is more motivating than loss to a liked cause",
      ],
    },
    social: {
      description: "Publicize commitments to create reputational stakes",
      findings: [
        "Public commitments are more effective than private ones",
        "Individuals maintain commitments partly to avoid reputational damage and cognitive dissonance",
        "Mixed commitment settings (financial + social) are considered most beneficial",
      ],
    },
    hardVsSoft: {
      hard: "Removes future choice entirely (e.g., delete social media app)",
      soft: "Makes future deviation more costly but still possible (e.g., financial penalty)",
      finding: "Hard commitments show larger effects but lower adoption rates; soft commitments show moderate effects with higher adoption",
    },
  },

  appFeatureImplications: [
    "FEATURE: Optional stakes system - users can pledge money that's donated if they miss commitments",
    "FEATURE: Social commitment broadcasting - option to share commitment with friends or community",
    "FEATURE: Anti-charity option - money goes to a cause user dislikes (stronger motivation)",
    "FEATURE: Commitment contract creator with specific terms, timeline, and referee",
    "FEATURE: Graduated commitment levels - start soft, escalate to harder commitments as user gains confidence",
    "FEATURE: Accountability partner notification - partner gets notified of commitment status",
  ],
} as const;

// =============================================================================
// 6. SOCIAL ACCOUNTABILITY
// =============================================================================

export const SOCIAL_ACCOUNTABILITY = {
  researchers: [
    "Gail Matthews, PhD (Dominican University) - goal sharing study",
    "Jackson et al. (2015) - couples behavior change (JAMA Internal Medicine)",
    "Centola (2011) - social networks and behavior change",
  ],
  keyStudies: [
    {
      researcher: "Gail Matthews",
      year: 2015,
      finding: "Participants who wrote down goals AND sent weekly updates to a friend were 50% more likely to succeed than those who kept goals to themselves",
      effectDetail: "Accountability partner increases follow-through by over 70%",
    },
    {
      researcher: "Jackson et al.",
      year: 2015,
      publication: "JAMA Internal Medicine",
      finding: "Couples were more likely to make healthy behavioral changes if their partner adopted healthy changes too",
    },
    {
      researcher: "Wing & Jeffery",
      year: 1999,
      finding: "In a 15-week weight-loss program, those with buddy support were significantly more successful than solo participants",
    },
  ],

  psychologicalMechanisms: [
    "Social bonding and shared experience foster commitment and reduce attrition",
    "Participants are more likely to adhere when accountable to a peer",
    "Accountability interactions can be effective even via text/messaging (low cost, high impact)",
    "The Hawthorne effect: being observed changes behavior even without feedback",
    "Social facilitation: performing with others increases effort on well-learned tasks",
  ],

  appFeatureImplications: [
    "FEATURE: Accountability partner matching - pair users with compatible habit partners",
    "FEATURE: Weekly progress reports automatically shared with accountability partner",
    "FEATURE: Partner check-in prompts - 'How did your partner do this week?'",
    "FEATURE: Couple/friend pair mode - linked accounts with shared habit challenges",
    "FEATURE: Small group challenges (3-5 people) for social support without overwhelm",
    "FEATURE: 'Supporter' role - friends can send encouragement without doing the habit themselves",
    "FEATURE: Minimal viable accountability - even showing 'X people are working on this today' increases commitment",
  ],
} as const;

// =============================================================================
// 7. IDENTITY-BASED HABITS
// =============================================================================

export const IDENTITY_BASED_HABITS = {
  researcher: "James Clear (popularizer); draws on self-concept research from Daryl Bem (self-perception theory) and Carol Dweck (mindset theory)",
  year: 2018,
  publication: "Atomic Habits (Avery/Penguin Random House)",
  relatedResearch: [
    "Bem (1972). Self-perception theory. Advances in Experimental Social Psychology, 6, 1-62",
    "Oyserman et al. (2006). Possible selves and academic outcomes. Journal of Personality and Social Psychology",
    "Bryan et al. (2011). Motivating voter turnout by invoking the self. PNAS - found 'being a voter' framing increased turnout over 'voting' framing",
  ],

  coreConcept: `True behavior change is identity change. The most effective approach to habits operates
on three layers: outcomes (what you get), processes (what you do), and identity (what you believe).
Most people start with outcomes; the most effective approach starts with identity.`,

  keyFindings: [
    "Your current behaviors are a reflection of your current identity - your 'repeated beingness'",
    "Each habit is a 'vote' for the type of person you wish to become",
    "Small wins accumulate evidence for a new identity gradually",
    "Identity-based framing ('I am a runner' vs. 'I am trying to run') increases persistence",
    "Bryan et al. (2011) PNAS study: noun-based identity framing ('be a voter') was 11% more effective than verb-based ('go vote')",
    "Self-perception theory (Bem): people infer their identities from observing their own behavior",
    "Possible selves research (Oyserman): vivid images of future self motivate present behavior",
  ],

  appFeatureImplications: [
    "FEATURE: Identity statement creator - users define WHO they want to become, not just what they want to do",
    "FEATURE: 'I am a...' framing throughout the app instead of 'I want to...'",
    "FEATURE: Identity vote counter - 'You've cast 47 votes for being a healthy eater this month'",
    "FEATURE: Identity evolution timeline showing transformation from past self to current self to future self",
    "FEATURE: Character/avatar that visually evolves as habits accumulate (embodied identity change)",
    "FEATURE: Regular identity reflection prompts: 'Who are you becoming through these habits?'",
    "FEATURE: Future self visualization exercises",
  ],
} as const;

// =============================================================================
// 8. FRICTION / ENVIRONMENT DESIGN / CHOICE ARCHITECTURE
// =============================================================================

export const FRICTION_AND_ENVIRONMENT_DESIGN = {
  researchers: [
    "Kurt Lewin (1890-1947) - channel factors and force-field analysis",
    "Richard Thaler & Cass Sunstein - Nudge theory and choice architecture",
    "Wendy Wood - friction and habit research",
  ],
  publications: [
    "Lewin (1951). Field theory in social science. Harper & Brothers",
    "Thaler & Sunstein (2008). Nudge: Improving Decisions About Health, Wealth, and Happiness",
    "Wood & Neal (2016). Healthy through habit: Interventions for initiating & maintaining health behavior change. Behavioral Science & Policy, 2(1), 71-83",
  ],

  lewinChannelFactors: {
    concept: `Small situational factors that either facilitate or block behavior, like a channel
directing the flow of water. Behavior = f(Person, Environment). Tiny environmental changes
can produce massive behavioral shifts.`,
    classicStudy: `Lewin showed that changing the channel of food distribution (e.g., which cuts
of meat were available) was far more effective than education or persuasion in changing eating
habits during WWII.`,
    modernApplication: "Became the foundation for 'nudge' theory and choice architecture",
  },

  frictionResearch: {
    keyFindings: [
      "Even 20 seconds of additional friction can prevent a behavior (Shawn Achor, 2010)",
      "Reducing friction for desired behaviors is MORE effective than increasing motivation (Wood, 2019)",
      "Default options are enormously powerful: organ donation rates differ by 50%+ based on opt-in vs. opt-out",
      "Physical environment changes outperform information campaigns for behavior change",
      "Adding friction to undesired behaviors (e.g., putting phone in another room) is highly effective",
      "Choice architecture: the way options are presented significantly influences which option is chosen",
    ],
  },

  appFeatureImplications: [
    "FEATURE: Friction audit wizard - walks users through identifying and removing barriers to good habits",
    "FEATURE: 'Add friction' suggestions for bad habits (e.g., 'Put the cookie jar in a hard-to-reach cabinet')",
    "FEATURE: Smart defaults - pre-populate with evidence-based optimal settings",
    "FEATURE: One-tap habit completion - minimize friction in the tracking process itself",
    "FEATURE: Environment design challenges - weekly prompts to make one physical change to support habits",
    "FEATURE: '20-second rule' tips - make good habits 20 seconds easier, bad habits 20 seconds harder",
    "FEATURE: Reduce decision fatigue - present fewer choices at key moments, batch decisions during setup",
  ],
} as const;

// =============================================================================
// 9. VARIABLE REWARD SCHEDULES / HOOK MODEL
// =============================================================================

export const VARIABLE_REWARDS_AND_HOOK_MODEL = {
  researchers: [
    "B.F. Skinner (1904-1990) - operant conditioning and reinforcement schedules",
    "Nir Eyal - Hook Model for habit-forming products",
    "Wolfram Schultz - dopamine prediction error signals",
  ],
  publications: [
    "Ferster & Skinner (1957). Schedules of reinforcement. Appleton-Century-Crofts",
    "Eyal (2014). Hooked: How to Build Habit-Forming Products (Portfolio/Penguin)",
    "Schultz et al. (1997). A neural substrate of prediction and reward. Science, 275(5306), 1593-1599",
  ],

  skinnerReinforcementSchedules: {
    variableRatio: {
      description: "Reinforcement after an unpredictable number of responses",
      finding: "Produces the HIGHEST and most PERSISTENT response rates of all schedules",
      finding2: "Variable-ratio reinforcement produces the SLOWEST rate of extinction",
      mechanism: "Uncertainty creates anticipation; each response could be THE one that earns the reward",
      examples: ["Slot machines", "Social media feeds", "Fishing"],
    },
    fixedRatio: {
      description: "Reinforcement after a set number of responses",
      finding: "Produces 'post-reinforcement pauses' - effort drops after each reward",
      implication: "Pure streak-based rewards may cause disengagement right after milestones",
    },
    variableInterval: {
      description: "Reinforcement after unpredictable time periods",
      finding: "Produces steady, moderate response rates",
      examples: ["Email checking", "Random bonus rewards in apps"],
    },
  },

  eyalHookModel: {
    fourStages: [
      { stage: "Trigger", description: "External (notification) or internal (emotion) cue that initiates behavior" },
      { stage: "Action", description: "Simplest behavior in anticipation of reward (BJ Fogg's B=MAP)" },
      { stage: "Variable Reward", description: "Unpredictable positive reinforcement that satisfies but leaves wanting more" },
      { stage: "Investment", description: "User puts something in (data, effort, social capital) that increases future value" },
    ],
    threeTypesOfVariableReward: [
      { type: "Tribe", description: "Social rewards - validation, acceptance, belonging" },
      { type: "Hunt", description: "Material resources and information - the pursuit itself is rewarding" },
      { type: "Self", description: "Personal mastery, competence, completion - intrinsic satisfaction" },
    ],
    ethicalNote: "Eyal distinguishes between manipulation (against user interests) and persuasion (aligned with user goals). Habit apps should use these ethically FOR the user.",
  },

  appFeatureImplications: [
    "FEATURE: Random bonus rewards (surprise XP, mystery achievements) alongside predictable rewards",
    "FEATURE: 'Treasure chest' after variable numbers of completed habits (not always the same count)",
    "FEATURE: Mix reward types: social (Tribe), resource (Hunt), and mastery (Self) rewards",
    "FEATURE: Progressive investment - as users invest more data/customization, the app becomes more valuable to them",
    "FEATURE: Surprise milestone celebrations that aren't shown in advance",
    "FEATURE: Daily spin wheel or random bonus with variable payouts",
    "FEATURE: Internal trigger development - help users recognize emotions/situations that should trigger their habits",
    "CRITICAL: Avoid post-reinforcement pauses by NOT making all rewards streak-based; mix fixed and variable schedules",
  ],
} as const;

// =============================================================================
// 10. SELF-COMPASSION AND HABIT RECOVERY
// =============================================================================

export const SELF_COMPASSION_AND_RECOVERY = {
  researchers: [
    "Kristin Neff, PhD (University of Texas at Austin) - self-compassion theory and research",
    "Janet Polivy & C. Peter Herman (University of Toronto) - 'what-the-hell effect'",
    "Kelly McGonigal, PhD (Stanford) - self-compassion and willpower",
    "Adams & Leary (2007) - self-compassion reduces counterregulatory eating",
  ],
  publications: [
    "Neff (2003). Self-compassion: An alternative conceptualization of a healthy attitude toward oneself. Self and Identity, 2, 85-101",
    "Neff (2023). Self-compassion: Theory, method, research, and intervention. Annual Review of Psychology, 74, 193-218",
    "Polivy & Herman (1985). Dieting and binging: A causal analysis. American Psychologist, 40(2), 193-201",
    "Adams & Leary (2007). Promoting self-compassionate attitudes toward eating among restrictive and guilty eaters. Journal of Social and Clinical Psychology, 26(10), 1120-1144",
  ],

  whatTheHellEffect: {
    discoveredBy: "Janet Polivy & C. Peter Herman",
    year: 1985,
    definition: `A cognitive pattern where a minor lapse triggers all-or-nothing thinking, leading to
complete behavioral collapse. "My diet is already broken, so what the hell, I might as well eat everything."`,
    mechanism: [
      "Violation of a self-imposed rule triggers guilt and shame",
      "Guilt/shame overwhelms self-regulation capacity",
      "The person abandons the goal entirely, leading to binge behavior",
      "This creates more guilt, perpetuating the cycle",
    ],
    alsoKnownAs: "Abstinence violation effect (in addiction research, Marlatt & Gordon, 1985)",
  },

  selfCompassionAsAntidote: {
    threeComponents: [
      { component: "Self-kindness", definition: "Treating yourself with warmth rather than harsh judgment", vsAlternative: "vs. self-criticism" },
      { component: "Common humanity", definition: "Recognizing that suffering and failure are universal human experiences", vsAlternative: "vs. isolation" },
      { component: "Mindfulness", definition: "Balanced awareness of negative emotions without suppression or exaggeration", vsAlternative: "vs. over-identification" },
    ],
    keyFindings: [
      "Self-compassion after dietary lapse reduced subsequent overeating (Adams & Leary, 2007)",
      "Self-compassionate individuals are more likely to pursue growth and mastery goals (Self and Identity study)",
      "Self-compassion is associated with greater motivation and improved self-control after perceived failures",
      "How you handle mistakes is MORE important than the fact that you made them",
      "Self-compassion interrupts the guilt->abandonment cycle that turns slips into relapses",
      "Self-compassionate people are not less motivated - they are MORE resilient after setbacks",
    ],
  },

  appFeatureImplications: [
    "FEATURE: 'Comeback' system instead of 'streak broken' - frame breaks as normal, not failures",
    "FEATURE: Self-compassion prompts after missed habits: 'Everyone misses sometimes. What matters is what you do next.'",
    "FEATURE: 'Slip, not slide' messaging - normalize single lapses and prevent all-or-nothing thinking",
    "FEATURE: Recovery streaks - track how quickly user bounces back after a miss (reward resilience)",
    "FEATURE: Common humanity messaging: 'X% of users also missed today. You're not alone.'",
    "FEATURE: Gentle re-engagement: no angry red indicators or punishment visuals for missed days",
    "FEATURE: Self-compassion journal prompt after a lapse: 'What would you say to a friend who missed?'",
    "FEATURE: 'Best streak' alongside 'current streak' so a broken streak still preserves the achievement",
    "CRITICAL: Never use shame, guilt, or punishment-framing for missed habits. This BACKFIRES per the research.",
  ],
} as const;

// =============================================================================
// 11. MINDFULNESS AND HABIT AWARENESS
// =============================================================================

export const MINDFULNESS_AND_HABIT_AWARENESS = {
  researchers: [
    "Judson Brewer, MD PhD (Brown University) - mindfulness and habit change",
    "Eric Garland - Mindfulness-Oriented Recovery Enhancement",
    "Remskar et al. (2024) - digital mindfulness and health behavior",
  ],
  publications: [
    "Brewer et al. (2011). Mindfulness training for smoking cessation. Drug and Alcohol Dependence, 119(1-2), 72-80",
    "Remskar et al. (2024). Mindfulness improves psychological health and supports health behaviour cognitions. British Journal of Health Psychology",
    "Loucks et al. (2021). Mindfulness and cardiovascular disease risk. Journal of the American Heart Association",
  ],

  keyFindings: [
    "People with high trait mindfulness engage in more health behaviors (meta-analysis of 30,000+ participants)",
    "Mindfulness increases awareness of automatic behavioral patterns, creating a 'space' between trigger and response",
    "Judson Brewer's research: mindfulness training was twice as effective as standard treatment for smoking cessation",
    "Mindfulness reduces stress-based habit triggers by improving emotion regulation",
    "Digital mindfulness-based interventions improved psychological health AND health behavior cognitions (Remskar, 2024)",
    "Mindfulness helps people reorient to health values and goals more quickly after lapses",
    "Mindfulness enhances interoception (body awareness), helping people recognize habit urges without acting on them",
  ],

  appFeatureImplications: [
    "FEATURE: Pre-habit mindful pause - brief breathing exercise before marking a habit complete",
    "FEATURE: Mindful check-in: 'How are you feeling right now?' before habit tracking",
    "FEATURE: Urge surfing guidance when user wants to break a bad habit - notice the urge without acting",
    "FEATURE: Body scan micro-exercise tied to habit completion",
    "FEATURE: Weekly mindful reflection: 'What patterns did you notice this week?'",
    "FEATURE: Trigger awareness journal - help users map the emotions/contexts that trigger habitual behavior",
    "FEATURE: Integration with meditation/breathing exercises as complementary habit suggestions",
  ],
} as const;

// =============================================================================
// 12. PROGRESS MONITORING AND SELF-TRACKING
// =============================================================================

export const PROGRESS_MONITORING = {
  researchers: [
    "Harkin et al. (2016) - meta-analysis of progress monitoring on goal attainment",
    "Michie et al. (2009) - self-monitoring as behavior change technique",
    "Quantified Self community research",
  ],
  publications: [
    "Harkin et al. (2016). Does monitoring goal progress promote goal attainment? A meta-analysis of the experimental evidence. Psychological Bulletin, 142(2), 198-229",
    "Michie et al. (2009). Effective techniques in healthy eating and physical activity interventions: A meta-regression. Health Psychology, 28(6), 690-701",
    "JMIR systematic review on self-tracking and the quantified self (2021): 67 empirical studies",
  ],

  keyFindings: [
    "Harkin et al. (2016) meta-analysis: monitoring goal progress SIGNIFICANTLY promotes goal attainment across 138 studies",
    "Self-monitoring of behavior is the single most commonly applied AND most effective behavior change technique in digital interventions",
    "Physical recording of behavior (vs. mental monitoring) produces larger effects",
    "Frequency of monitoring matters: more frequent monitoring = better outcomes",
    "Public monitoring (shared with others) is more effective than private monitoring",
    "Visualization of data and long-term trends motivate sustained tracking",
    "Self-monitoring reveals discrepancies between current behavior and goals, which motivates change",
    "Self-quantification apps had 368 million users in 2023; ~60% use tracking devices daily",
    "Monitoring is most effective when combined with goal-setting and feedback",
  ],

  appFeatureImplications: [
    "FEATURE: Make tracking itself as frictionless as possible (one-tap check-in)",
    "FEATURE: Rich visualization of progress over time - charts, graphs, heatmaps",
    "FEATURE: Trend analysis showing patterns across days, weeks, months",
    "FEATURE: Discrepancy highlighting - show gap between current and goal performance",
    "FEATURE: Optional public progress sharing for enhanced accountability",
    "FEATURE: Automatic data capture where possible (integrate with health apps, screen time data)",
    "FEATURE: Weekly/monthly summary reports with insights",
    "FEATURE: Streak visualization, calendar heatmaps (a la GitHub contribution graph)",
    "CRITICAL: The tracking interface IS the product - invest heavily in making it satisfying to use",
  ],
} as const;

// =============================================================================
// 13. GAMIFICATION SCIENCE
// =============================================================================

export const GAMIFICATION_SCIENCE = {

  octalysisFramework: {
    researcher: "Yu-kai Chou",
    year: 2015, // Actionable Gamification book; framework developed over 17+ years
    publication: "Actionable Gamification: Beyond Points, Badges, and Leaderboards (Octalysis Media)",
    citations: "3,300+ academic citations, adopted by Google, LEGO, Tesla, United Nations",

    eightCoreDrives: [
      {
        number: 1,
        name: "Epic Meaning & Calling",
        description: "Believing you're part of something greater than yourself",
        appDesign: "Frame habit journey as a heroic quest; narrative that the user's growth matters",
        hatType: "White Hat (empowering)",
      },
      {
        number: 2,
        name: "Development & Accomplishment",
        description: "Internal drive to progress, develop skills, achieve mastery",
        appDesign: "XP systems, level-ups, skill trees, achievement badges earned through genuine challenge",
        hatType: "White Hat (empowering)",
      },
      {
        number: 3,
        name: "Empowerment of Creativity & Feedback",
        description: "Creative expression and seeing results of creative choices",
        appDesign: "Let users customize their experience, create their own habit combinations, design their path",
        hatType: "White Hat (empowering)",
      },
      {
        number: 4,
        name: "Ownership & Possession",
        description: "Drive to own, control, and improve things",
        appDesign: "Virtual collections, customizable profiles, accumulated data that feels valuable",
        hatType: "Left Brain (extrinsic)",
      },
      {
        number: 5,
        name: "Social Influence & Relatedness",
        description: "Social elements including mentorship, competition, companionship, envy",
        appDesign: "Leaderboards, group challenges, social proof, peer comparison",
        hatType: "Right Brain (intrinsic)",
      },
      {
        number: 6,
        name: "Scarcity & Impatience",
        description: "Wanting something because you can't have it immediately",
        appDesign: "Time-limited challenges, locked content that unlocks with progress, limited-edition rewards",
        hatType: "Black Hat (urgent)",
      },
      {
        number: 7,
        name: "Unpredictability & Curiosity",
        description: "Wanting to know what happens next; variable rewards",
        appDesign: "Mystery rewards, random bonuses, narrative surprises, variable reinforcement",
        hatType: "Black Hat (urgent)",
      },
      {
        number: 8,
        name: "Loss & Avoidance",
        description: "Avoiding negative outcomes, not wanting to lose progress",
        appDesign: "Streak protection, decaying resources, loss-framed challenges",
        hatType: "Black Hat (urgent)",
      },
    ],

    whiteVsBlackHat: {
      whiteHat: "Drives 1-3 create positive, empowered feelings. Users feel good but may lack urgency.",
      blackHat: "Drives 6-8 create urgency and obsession but can leave users feeling manipulated.",
      recommendation: "Best designs use White Hat for core engagement and sprinkle Black Hat for urgency. An app relying primarily on Black Hat will have high engagement but high churn.",
    },
  },

  recentMetaAnalyses: {
    healthBehavior2024: {
      source: "Lancet eClinicalMedicine (2024) - Digital health applications with or without gamification",
      findings: [
        "Small to medium effect of gamified interventions on physical activity (2,407 participants, 16 studies)",
        "Gamified interventions outperformed BOTH inactive controls AND active non-gamified interventions",
        "Points and achievements improved exercise desire",
        "Points + leaderboards increased physical activity",
        "Rewards + leaderboards in cooperative settings increased physical activity",
        "Long-term effects (14 weeks post-intervention) were weaker - very small to small effect",
      ],
    },
    gamificationMotivation2023: {
      source: "Educational Technology Research and Development (2023)",
      findings: [
        "Gamification enhances intrinsic motivation with a small effect size (Hedges g = 0.257)",
        "Gamification enhances perceived autonomy and relatedness",
        "Minimal impact on perceived competence - suggesting gamification needs to be paired with genuine challenge",
      ],
    },
    gamificationLearning2024: {
      source: "British Journal of Educational Technology (2024) - Meta-analysis of 41 studies, 5,071+ participants",
      findings: [
        "Large overall effect size on learning outcomes (g = 0.822)",
        "Gamification sustains engagement, fosters persistence, facilitates communication",
        "Effectiveness varies significantly depending on implementation details",
      ],
    },
  },

  appFeatureImplications: [
    "FEATURE: Quest/narrative system wrapping habit tracking in epic story (Core Drive 1)",
    "FEATURE: XP, levels, skill trees with genuine challenge requirements (Core Drive 2)",
    "FEATURE: High customization - user-designed avatars, paths, habit combos (Core Drive 3)",
    "FEATURE: Collectible system - rare items, complete sets, accumulated treasures (Core Drive 4)",
    "FEATURE: Cooperative challenges and friendly competition (Core Drive 5)",
    "FEATURE: Limited-time events and seasonal challenges (Core Drive 6)",
    "FEATURE: Mystery rewards and surprise bonuses (Core Drive 7)",
    "FEATURE: Streak protection items and decay mechanics used SPARINGLY (Core Drive 8)",
    "CRITICAL: Lean heavily on White Hat (1-3) for core loop. Use Black Hat (6-8) sparingly as spice, not the main dish",
    "CRITICAL: Long-term gamification effects decay - refresh game elements regularly",
  ],
} as const;

// =============================================================================
// 14. JOURNALING AND REFLECTION
// =============================================================================

export const JOURNALING_AND_REFLECTION = {
  researchers: [
    "James W. Pennebaker, PhD (University of Texas at Austin) - expressive writing",
    "Schon (1983) - reflective practice",
    "King (2001) - writing about life goals and well-being",
  ],
  publications: [
    "Pennebaker & Beall (1986). Confronting a traumatic event: Toward an understanding of inhibition and disease. Journal of Abnormal Psychology, 95(3), 274-281",
    "Pennebaker (1997). Writing about emotional experiences as a therapeutic process. Psychological Science, 8(3), 162-166",
    "King (2001). The health benefits of writing about life goals. Personality and Social Psychology Bulletin, 27(7), 798-807",
  ],

  keyFindings: [
    "Writing for 15 minutes/day for 4 consecutive days about stressful experiences improved physical health outcomes",
    "Expressive writers showed fewer health clinic visits in the months following the intervention",
    "The key mechanism: constructing a meaningful personal NARRATIVE brings clarity and perspective",
    "Use of cognitive words ('realize,' 'think,' 'consider,' 'because') predicted improvement",
    "King (2001): writing about 'best possible future self' for 4 days improved well-being and reduced illness",
    "Reflective writing helps people process emotion, find meaning, and construct a coherent self-narrative",
    "Effects extend to: attitude change, creativity, working memory, motivation, life satisfaction, and school performance",
    "Brief structured writing prompts are more effective than open-ended 'write whatever' instructions",
  ],

  appFeatureImplications: [
    "FEATURE: Daily micro-journal prompts (2-3 sentence structured reflections, not open-ended)",
    "FEATURE: 'Best possible self' visualization writing exercise during onboarding and monthly",
    "FEATURE: Habit-specific reflection prompts: 'What did you learn about yourself today?'",
    "FEATURE: Weekly narrative review: structured prompt helping user tell their own change story",
    "FEATURE: 'Why' journal - periodic prompts to reconnect habits with deeper values and motivations",
    "FEATURE: Cognitive reframing prompts using words like 'realize,' 'understand,' 'because' to promote insight",
    "FEATURE: End-of-day reflection: 'What went well? What was challenging? What will you try tomorrow?'",
    "FEATURE: Monthly or quarterly 'letter to future self' or 'letter from future self' exercise",
  ],
} as const;

// =============================================================================
// 15. CONTEXTUAL / ENVIRONMENTAL CUES
// =============================================================================

export const CONTEXTUAL_CUES = {
  researchers: [
    "Wendy Wood & David T. Neal - habit-context link",
    "Kurt Lewin - channel factors",
    "Todd Rogers et al. - implementation prompts",
  ],
  publications: [
    "Wood & Neal (2007). A new look at habits and the habit-goal interface. Psychological Review, 114(4), 843-863",
    "Neal et al. (2011). How do habits guide behavior? Perceived and actual triggers of habits in daily life. Journal of Experimental Social Psychology, 47(2), 492-498",
    "Wood, Quinn & Kashy (2002). Habits in everyday life. Journal of Personality and Social Psychology, 83(6), 1281-1297",
  ],

  keyFindings: [
    "Performance contexts (physical locations, other people, preceding actions) directly trigger habitual behavior",
    "Strong habits are activated by context cues WITHOUT a mediating goal - the context IS the trigger",
    "When transferred to a new university, students with strong habits changed behavior because context cues changed",
    "Context cues include: physical location, time of day, emotional state, other people present, preceding actions in a sequence",
    "People MISPERCEIVE their habits as being goal-driven, when they are actually context-driven",
    "The habit system learns incrementally that certain environmental features trigger specific actions",
    "Stable contexts produce stronger habits than variable contexts",
    "Context change is one of the most powerful ways to break unwanted habits",
  ],

  appFeatureImplications: [
    "FEATURE: Context-tagged habits - users define WHERE, WHEN, and AFTER WHAT for each habit",
    "FEATURE: Location-based triggers using geofencing (remind when entering gym, kitchen, office)",
    "FEATURE: Time-of-day anchoring with awareness of user's actual routine patterns",
    "FEATURE: Context consistency score - track whether user performs habits in consistent contexts",
    "FEATURE: 'New context alert' when user travels or changes routine - help rebuild cue associations",
    "FEATURE: Preceding-action triggers: remind user after they complete a specific earlier habit",
    "FEATURE: Context mapping visualization - show which locations/times are associated with which habits",
    "FEATURE: Bad habit disruption tool: identify context cues for unwanted habits and design alternatives",
  ],
} as const;

// =============================================================================
// 16. HABIT STACKING AND CHAINING
// =============================================================================

export const HABIT_STACKING = {
  researchers: [
    "BJ Fogg, PhD - 'anchoring' concept",
    "James Clear - 'habit stacking' popularization",
    "S.J. Scott - Habit Stacking (2014 book)",
  ],
  publications: [
    "Fogg (2019). Tiny Habits (Houghton Mifflin Harcourt) - 'anchor moment' concept",
    "Clear (2018). Atomic Habits (Avery) - habit stacking formula",
    "Journal of Applied Psychology (2025): Habit stacking increased success rates by 64% vs. standalone habits",
  ],

  coreConcept: `Stack new habits onto existing routines by linking them: "After I [CURRENT HABIT],
I will [NEW HABIT]." The existing habit serves as a reliable trigger (anchor) for the new one.
Once mastered, chains can be extended: A -> B -> C -> D.`,

  keyFindings: [
    "Existing neural pathways for the anchor habit reduce the cognitive load of initiating the new habit",
    "When a new behavior consistently follows an established habit, the brain links them as a single behavioral unit",
    "Habit stacking leverages the natural momentum of one behavior leading into the next",
    "2025 study: habit stacking increased success rates by 64% compared to standalone habits",
    "Fogg: the 'anchor moment' must be highly reliable - something you already do every day without fail",
    "Stacks work best when behaviors are compatible in context (same location, similar energy level)",
    "Longer chains (4+ habits) should be built incrementally, not all at once",
  ],

  appFeatureImplications: [
    "FEATURE: Visual habit chain builder - drag-and-drop to create sequences of linked habits",
    "FEATURE: 'After I..., I will...' template for every new habit",
    "FEATURE: Anchor habit identifier - help users find their most reliable existing habits to stack onto",
    "FEATURE: Chain visualization showing flow from morning anchor through full routine",
    "FEATURE: Chain completion tracking - bonus XP for completing an entire chain in sequence",
    "FEATURE: Incremental chain building - app suggests adding ONE new link at a time, not multiple",
    "FEATURE: Chain strength indicator - show which links are strong (consistent) vs. weak (often broken)",
    "FEATURE: Smart suggestions: 'Users who do [habit A] often pair it with [habit B]'",
  ],
} as const;

// =============================================================================
// 17. FRESH START EFFECT
// =============================================================================

export const FRESH_START_EFFECT = {
  researcher: "Hengchen Dai, Katherine L. Milkman, Jason Riis",
  institution: "Wharton School, University of Pennsylvania",
  year: 2014,
  publication: "Dai, Milkman & Riis (2014). The fresh start effect: Temporal landmarks motivate aspirational behavior. Management Science, 60(10), 2563-2582",

  coreConcept: `Temporal landmarks (e.g., new year, new week, birthday, first day of a month)
create psychological "fresh starts" that motivate goal pursuit by creating a break between
a past imperfect self and a new beginning.`,

  keyFindings: [
    "Google searches for 'diet' spike at New Year, start of month, start of week, and after holidays",
    "Gym visits increase 33% at the start of a new week",
    "Gym visits increase 47% at the start of a new semester",
    "Commitments to pursue goals increase following temporal landmarks",
    "Mechanism: temporal landmarks CREATE new mental accounting periods, relegating past failures to a 'previous period'",
    "The effect works for both calendar landmarks (Monday, January 1st) and personal landmarks (birthday, anniversary)",
    "People take a 'big picture' view of their lives at these moments, boosting aspirational behavior",
  ],

  appFeatureImplications: [
    "FEATURE: 'Fresh Start' prompts aligned with temporal landmarks (Monday, 1st of month, birthday, seasons)",
    "FEATURE: 'New chapter' option that lets users reset their narrative without losing historical data",
    "FEATURE: Special onboarding/re-engagement campaigns timed to Mondays, Jan 1, user's birthday, etc.",
    "FEATURE: 'Fresh start calendar' showing upcoming landmarks with motivational prompts",
    "FEATURE: Seasonal challenge events tied to natural fresh-start moments",
    "FEATURE: Personal milestone celebrations as fresh-start triggers (promotion, moving, graduation)",
    "FEATURE: Monday re-engagement for users who had a rough previous week",
    "FEATURE: 'This week's fresh start' - reframe every Monday as a new beginning",
  ],
} as const;

// =============================================================================
// 18. GOAL GRADIENT EFFECT
// =============================================================================

export const GOAL_GRADIENT_EFFECT = {
  researchers: [
    "Clark Hull (1932, 1934) - original hypothesis (rats in alleys)",
    "Ran Kivetz, Oleg Urminsky, Yuhuang Zheng (2006) - modern consumer research",
  ],
  publications: [
    "Hull (1932). The goal-gradient hypothesis and maze learning. Psychological Review, 39(1), 25-43",
    "Kivetz, Urminsky & Zheng (2006). The goal-gradient hypothesis resurrected: Purchase acceleration, illusionary goal progress, and customer retention. Journal of Marketing Research, 43(1), 39-58",
  ],

  coreConcept: `People increase effort as they approach a goal. The closer you are to completion,
the harder and faster you work.`,

  keyFindings: [
    "Hull (1934): rats ran progressively faster as they approached food at the end of an alley",
    "Kivetz et al. (2006): cafe customers purchased coffee more frequently as they neared a free coffee reward",
    "Illusionary goal progress: a 12-stamp card with 2 pre-stamped completed FASTER than a 10-stamp blank card (same actual effort required)",
    "Internet users rating songs visited more often, rated more songs, and persisted longer as they approached reward",
    "Effort investment = function of the PROPORTION of original distance remaining, not absolute distance",
    "Post-reward reset: after achieving a goal, effort drops dramatically before climbing again toward the next goal",
    "People who reach goals faster are more likely to engage in repeat goal pursuit",
  ],

  appFeatureImplications: [
    "FEATURE: 'Endowed progress' - give users a head start on every challenge (2 of 10 already done = 20% complete)",
    "FEATURE: Progress bars that show proximity to next milestone/reward - ALWAYS show the next achievable goal",
    "FEATURE: Shorter goal cycles (weekly challenges vs. monthly) to keep the gradient effect active",
    "FEATURE: Progressive milestones that get closer together as user advances (accelerating feedback)",
    "FEATURE: 'Almost there!' notifications when user is close to completing a challenge or milestone",
    "FEATURE: Sub-goals within larger goals to maintain multiple simultaneous gradients",
    "FEATURE: Post-goal celebration immediately followed by next goal reveal to prevent effort drop",
    "FEATURE: Visual 'distance to goal' that creates a sense of acceleration (narrowing progress bar)",
  ],
} as const;

// =============================================================================
// 19. LOSS AVERSION
// =============================================================================

export const LOSS_AVERSION = {
  researchers: [
    "Daniel Kahneman & Amos Tversky",
    "Richard Thaler - endowment effect",
    "Hossain & List (2012) - loss aversion in workplace productivity",
  ],
  publications: [
    "Kahneman & Tversky (1979). Prospect theory: An analysis of decision under risk. Econometrica, 47(2), 263-292",
    "Tversky & Kahneman (1991). Loss aversion in riskless choice. Quarterly Journal of Economics, 106(4), 1039-1061",
    "Hossain & List (2012). The behavioralist visits the factory. Management Science, 58(12), 2151-2167",
  ],

  coreConcept: `Losses feel approximately TWICE as powerful as equivalent gains. People are more
motivated to avoid losing something they have than to gain something they don't have.`,

  keyFindings: [
    "The pain of losing $100 is psychologically ~2x the pleasure of gaining $100",
    "Loss-framed incentives ('lose $X if you don't...') outperform gain-framed incentives ('gain $X if you do...') for behavior change",
    "Hossain & List (2012): workers given a bonus upfront that they'd lose if they didn't meet targets performed significantly better than workers promised a bonus for meeting targets",
    "The endowment effect: people value things more once they own them",
    "Loss aversion is universal - Kahneman & Tversky's findings replicated in 90% of countries tested",
    "Penalty frames are sometimes more effective than reward frames in motivating people",
    "However: excessive loss framing can trigger anxiety and avoidance behaviors",
  ],

  appFeatureImplications: [
    "FEATURE: 'Invest to protect' - give users points/resources upfront that they LOSE if they miss habits",
    "FEATURE: Streak protection items (limited) - users protect something valuable rather than earn something new",
    "FEATURE: Decaying garden/pet metaphor - growth accumulates but can decline with inactivity",
    "FEATURE: 'Don't lose your progress' messaging (used sparingly - combine with self-compassion)",
    "FEATURE: Commitment stakes - optional feature where users put real money at risk",
    "FEATURE: Endowed benefits - give new users some progress/status to start, creating something to lose",
    "CRITICAL: Use loss framing SPARINGLY and always pair with self-compassion messaging",
    "CRITICAL: Heavy loss framing leads to anxiety and app avoidance - balance with gains and encouragement",
    "CRITICAL: Never combine loss framing with shame - this triggers the 'what-the-hell effect'",
  ],
} as const;

// =============================================================================
// 20. AUTONOMY AND CHOICE
// =============================================================================

export const AUTONOMY_AND_CHOICE = {
  researchers: [
    "Deci & Ryan - self-determination theory (see section 2)",
    "Sheena Iyengar & Mark Lepper (2000) - choice overload",
    "Barry Schwartz (2004) - The Paradox of Choice",
    "Patall, Cooper & Wynn (2010) - choice in classrooms meta-analysis",
  ],
  publications: [
    "Iyengar & Lepper (2000). When choice is demotivating. Journal of Personality and Social Psychology, 79(6), 995-1006",
    "Schwartz (2004). The Paradox of Choice: Why More Is Less (Ecco/HarperCollins)",
    "Patall, Cooper & Wynn (2010). The effectiveness and relative importance of choice in the classroom. Journal of Educational Psychology, 102(4), 896-915",
    "Williams et al. (1996). Motivational predictors of weight loss and weight-loss maintenance. Journal of Personality and Social Psychology, 70(1), 115-126",
  ],

  keyFindings: [
    "Autonomy support in weight loss: dieters with autonomy support lost more weight AND maintained it better",
    "When social context is autonomy-supportive, people internalize regulation of important activities",
    "Choice-overload effect: too many options leads to decision paralysis and decreased satisfaction (Iyengar & Lepper, 2000)",
    "The 'jam study': shoppers faced with 24 jam varieties were 1/10th as likely to buy as those with 6 options",
    "Perceived autonomy mediates the effect of choice on behavioral retention",
    "Meaningful choices (aligned with values) are more motivating than arbitrary choices",
    "Cultural differences: personal choice is more motivating for Western individualist cultures; collectivist cultures may prefer trusted-other choices",
    "Optimal: provide SOME choice (3-5 options) but not overwhelming choice (20+ options)",
  ],

  appFeatureImplications: [
    "FEATURE: Curated choice - offer 3-5 recommended habit templates, not 50",
    "FEATURE: Progressive disclosure of options - simple start, more customization available as users advance",
    "FEATURE: 'Your way' mode - users can customize nearly everything if they want to, but defaults are great",
    "FEATURE: Value-aligned recommendations: 'Based on your goals, here are your top 3 options'",
    "FEATURE: No forced paths - multiple valid ways to engage with the app",
    "FEATURE: Autonomy-supportive language: 'You might consider...' rather than 'You must...'",
    "FEATURE: Let users choose their own reward types, challenge types, and tracking methods",
    "FEATURE: Opt-in complexity - power users can access advanced features without overwhelming beginners",
    "CRITICAL: Balance choice with simplicity. Choice is motivating only when it doesn't overwhelm.",
  ],
} as const;

// =============================================================================
// RECENT META-ANALYSES AND SYSTEMATIC REVIEWS (2020-2026)
// =============================================================================

export const RECENT_META_ANALYSES = {

  digitalBehaviorChangeForHabits2024: {
    title: "Digital Behavior Change Intervention Designs for Habit Formation: Systematic Review",
    source: "Journal of Medical Internet Research (JMIR), 2024",
    url: "https://www.jmir.org/2024/1/e54375",
    sampleSize: "41 research articles, databases searched from 2012-2022",
    keyFindings: [
      "Most applied behavior change techniques: self-monitoring, goal setting, and prompts/cues",
      "32 commonly used design strategies were identified for habit formation techniques",
      "Most studies use EXPLICIT interaction (conscious tracking) aligned with personalized techniques",
      "IMPLICIT interaction strategies (automatic/passive tracking) are lacking and represent an opportunity",
      "Habit formation techniques were based on: intentions, cues, and positive reinforcement",
      "Commonly used methods: automatic monitoring, descriptive feedback, general guidelines, self-set goals, time-based cues, virtual rewards",
    ],
  },

  standaloneDCBIsPhysicalActivity2025: {
    title: "Systematic review and meta-analysis of standalone digital behavior change interventions on physical activity",
    source: "npj Digital Medicine, 2025",
    url: "https://www.nature.com/articles/s41746-025-01827-4",
    keyFindings: [
      "Standalone digital behavior change interventions significantly improved physical activity and body metrics",
      "66.6% of studies used mobile applications as primary intervention platform",
      "Shorter interventions (< 12 weeks) showed GREATER effects than longer ones",
      "Aligns with habit formation theory: automaticity peaks around the 12-week mark",
    ],
  },

  habitFormationTimeMetaAnalysis2024: {
    title: "Time to Form a Habit: A Systematic Review and Meta-Analysis of Health Behaviour Habit Formation and Its Determinants",
    source: "PubMed, 2024",
    url: "https://pubmed.ncbi.nlm.nih.gov/39685110/",
    keyFindings: [
      "Updated Lally's original findings with broader sample",
      "Confirmed that habits can start forming within about two months",
      "Time required varies significantly across individuals and behavior types",
      "Significant meta-analytic improvements in habit scores pre- to post-intervention",
    ],
  },

  mobileAppsHabitFormation2025: {
    title: "The Impact of Dedicated Mobile Apps on Habit Formation: A Systematic Review",
    source: "ResearchGate, 2025",
    keyFindings: [
      "Mobile apps show promise for habit formation but evidence base needs strengthening",
      "Gap exists in robust evidence on the specific role of mobile apps in habit formation",
      "Most effective apps combine multiple behavior change techniques, not single approaches",
    ],
  },

  gamificationHealthBehavior2024: {
    title: "Effect of digital health applications with or without gamification on physical activity and cardiometabolic risk factors",
    source: "Lancet eClinicalMedicine, 2024",
    keyFindings: [
      "Small to medium effect of gamified interventions on physical activity (16 studies, 2,407 participants)",
      "Gamified interventions outperformed both inactive AND active non-gamified controls",
      "Points + achievements improved exercise desire",
      "Points + leaderboards increased physical activity",
      "Rewards + leaderboards in cooperative settings were effective",
      "Long-term effects (14 weeks post-intervention) were weaker",
    ],
  },

  sdtInBehaviorChangeTech2024: {
    title: "Designing for Sustained Motivation: A Review of Self-Determination Theory in Behaviour Change Technologies",
    source: "Interacting with Computers (Oxford Academic), 2024",
    keyFindings: [
      "Only 15 of 76 screened studies explicitly applied SDT",
      "SDT is more often used for tech engagement than genuine behavior change",
      "Most apps focus on intrinsic motivation while neglecting the extrinsic motivation spectrum",
      "Competence (data recording/analysis), autonomy (personalized goals), and relatedness (messaging) showed best results",
    ],
  },

  implementationIntentions642Tests2024: {
    title: "The When and How of Planning: Meta-Analysis of the Scope and Components of Implementation Intentions in 642 Tests",
    source: "ResearchGate, 2024",
    keyFindings: [
      "642 independent tests confirming implementation intentions effectiveness",
      "Effect sizes range from d = 0.27 to d = 0.66 across cognitive, affective, and behavioral outcomes",
      "If-then FORMAT matters: contingent plans outperform simple action plans",
      "Plan REHEARSAL increases effectiveness",
      "High MOTIVATION amplifies the effect",
    ],
  },
} as const;

// =============================================================================
// SYNTHESIS: TOP DESIGN PRINCIPLES FROM THE RESEARCH
// =============================================================================

export const RESEARCH_SYNTHESIS_DESIGN_PRINCIPLES = [
  {
    principle: "Make It Tiny, Then Grow",
    sources: ["BJ Fogg - Tiny Habits", "James Clear - Two-Minute Rule", "Lally - gradual automaticity"],
    insight: "Start with the smallest possible version of a habit. Automaticity builds through consistent repetition, not ambition.",
  },
  {
    principle: "Context Is King",
    sources: ["Wendy Wood - context cues", "Wood & Neal (2007)", "Lewin - channel factors"],
    insight: "Habits are triggered by environmental cues, not willpower. Design everything around consistent when/where/after-what contexts.",
  },
  {
    principle: "Protect Identity, Not Just Streaks",
    sources: ["James Clear - identity-based habits", "Bryan et al. PNAS 2011", "Neff - self-compassion"],
    insight: "Frame habits as votes for identity ('I am someone who...') and protect self-concept during lapses.",
  },
  {
    principle: "Self-Compassion Over Shame",
    sources: ["Kristin Neff", "Polivy & Herman - what-the-hell effect", "Adams & Leary 2007"],
    insight: "Shame after a miss triggers total relapse. Self-compassion interrupts this cycle. NEVER use guilt/punishment in the UI.",
  },
  {
    principle: "Plan the If-Then, Not Just the What",
    sources: ["Gollwitzer - implementation intentions", "642-test meta-analysis 2024"],
    insight: "Specific if-then plans (d = 0.65) are among the most powerful behavior change tools. Build them into habit setup.",
  },
  {
    principle: "Satisfy Autonomy, Competence, and Relatedness",
    sources: ["Deci & Ryan - SDT", "Noorbergen et al. 2024"],
    insight: "Every feature should support at least one basic psychological need. Most apps neglect relatedness.",
  },
  {
    principle: "Variable Rewards, But Ethically",
    sources: ["Skinner - VR schedules", "Eyal - Hook Model", "Chou - White Hat vs Black Hat"],
    insight: "Mix predictable and surprise rewards. Use White Hat gamification (meaning, mastery, creativity) as the core, Black Hat (scarcity, loss) as rare spice.",
  },
  {
    principle: "Leverage Fresh Starts",
    sources: ["Milkman et al. 2014 - fresh start effect"],
    insight: "Mondays, month starts, and personal milestones are natural re-engagement moments. Design around them.",
  },
  {
    principle: "Show the Gradient",
    sources: ["Kivetz et al. 2006 - goal gradient", "Hull 1932"],
    insight: "People accelerate near goals. Always show proximity to the next milestone. Give endowed progress (head starts).",
  },
  {
    principle: "Tracking IS the Intervention",
    sources: ["Harkin et al. 2016 meta-analysis", "Michie et al. 2009"],
    insight: "Self-monitoring is the single most effective behavior change technique. Make it one-tap, beautiful, and insightful.",
  },
  {
    principle: "Stack, Don't Scatter",
    sources: ["BJ Fogg - anchoring", "Clear - habit stacking", "JAP 2025 study"],
    insight: "New habits succeed 64% more when stacked onto existing routines. Build chain/sequence tools.",
  },
  {
    principle: "Bundle the Medicine with the Candy",
    sources: ["Milkman et al. 2014 - temptation bundling"],
    insight: "Pair 'should' activities with 'want' activities. The indulgence becomes the reward for the good behavior.",
  },
  {
    principle: "Write It Down, Reflect On It",
    sources: ["Pennebaker - expressive writing", "King 2001", "Harkin meta-analysis"],
    insight: "Brief structured reflection deepens commitment and helps construct change narratives. Include journaling.",
  },
  {
    principle: "Social Proof + Accountability, Not Surveillance",
    sources: ["Matthews 2015 - goal sharing", "Jackson JAMA 2015", "SDT - relatedness"],
    insight: "Social accountability boosts success by 50-70%, but framing matters: support, not surveillance.",
  },
  {
    principle: "Friction Is Your Most Powerful Design Tool",
    sources: ["Wendy Wood", "Lewin", "Thaler & Sunstein"],
    insight: "Reduce friction for desired behaviors; increase friction for undesired ones. 20 seconds of friction changes everything.",
  },
  {
    principle: "Loss Aversion: Handle With Care",
    sources: ["Kahneman & Tversky 1979", "Hossain & List 2012"],
    insight: "Losing feels 2x worse than gaining feels good. Use loss framing sparingly and ALWAYS pair with compassion.",
  },
] as const;
