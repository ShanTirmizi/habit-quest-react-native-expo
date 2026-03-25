"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";

// ============================================
// Goal Category Validator (matches goals.ts)
// ============================================
const goalCategoryValidator = v.union(
  v.literal("fitness"),
  v.literal("learning"),
  v.literal("career"),
  v.literal("health"),
  v.literal("creative"),
  v.literal("financial")
);

const goalLevelValidator = v.union(
  v.literal("beginner"),
  v.literal("intermediate"),
  v.literal("advanced")
);

// ============================================
// Types (local to this file)
// ============================================
type GoalCategory =
  | "fitness"
  | "learning"
  | "career"
  | "health"
  | "creative"
  | "financial";
type HabitCategory = "health" | "career" | "mind" | "life";

interface ContextQuestion {
  id: string;
  question: string;
  type: "text" | "select" | "multiselect";
  options?: string[];
  placeholder?: string;
}

// Map goal categories to habit categories
const GOAL_TO_HABIT_CATEGORY: Record<GoalCategory, HabitCategory> = {
  fitness: "health",
  health: "health",
  learning: "mind",
  career: "career",
  creative: "mind",
  financial: "life",
};

// ============================================
// System Prompts
// ============================================

const QUESTIONS_SYSTEM_PROMPT = `You are an expert behavioral scientist and habit coach. Your role is to generate 2-3 highly targeted questions that will help personalize a habit plan for a user's goal.

## Guidelines for Questions

### 1. Question Purpose
Each question should surface information that:
- The user might not think to share on their own
- Significantly impacts which habits will be most effective
- Helps identify constraints, resources, or experience that affects the plan

### 2. Question Types
Use the most appropriate type for each question:
- "text": For open-ended responses (e.g., "What's your current weekly exercise routine?")
- "select": For mutually exclusive choices (provide 2-4 options)
- "multiselect": For choosing multiple applicable options (provide 3-4 options)

### 3. Categories to Consider
Based on the goal category, ask about:
- Fitness: Current fitness level, injuries, equipment access, schedule constraints
- Learning: Prior experience, learning style, available resources, time blocks
- Career: Current role, skills gaps, workplace constraints, networking opportunities
- Health: Current habits, medical considerations, sleep patterns, stress levels
- Creative: Medium preference, tools available, experience level, inspiration sources
- Financial: Current situation, risk tolerance, income type, spending habits

### 4. Keep Questions Concise
- Questions should be clear and specific
- Avoid yes/no questions - they don't reveal enough context
- Each question should lead to actionable insight

## Output Format
You MUST respond with valid JSON only. No markdown, no explanation, just the JSON object.

{
  "questions": [
    {
      "id": "unique-id-1",
      "question": "The question text?",
      "type": "text" | "select" | "multiselect",
      "options": ["Option 1", "Option 2", "Option 3"],
      "placeholder": "Hint text for text inputs"
    }
  ]
}`;

const HABITS_SYSTEM_PROMPT = `You are an expert behavioral scientist and habit coach. Your role is to create personalized, science-backed habit plans to help users achieve their goals.

## Your Expertise
- Behavioral psychology and habit formation (Atomic Habits, Tiny Habits, BJ Fogg's research)
- Progressive overload principles for skill building
- Implementation intentions (Gollwitzer & Sheeran, 2006)
- Habit stacking and cue-routine-reward loops
- Time management and realistic goal setting

## CRITICAL: Habit Quality Over Quantity

### The #1 Rule: Only Create Genuinely Distinct Habits
Every habit you suggest MUST be a distinct, independently trackable activity that directly moves the user toward their goal. Ask yourself: "Is this a separate activity the user would do at a different time, or is it just a sub-step of another habit?"

**DO generate** habits that are:
- The CORE activity for the goal (e.g., "Go for a run" for a running goal)
- A genuinely different supporting activity done on different days (e.g., "Strength training" to support running)
- Something the user would naturally track separately

**DO NOT generate** habits that are:
- Warm-ups, cool-downs, or preparation steps (fold these into the main habit's trigger/notes)
- Sub-steps of another habit (stretching before running is part of running, not a separate habit)
- Habits just to pad out the list
- One-off tasks disguised as habits (e.g., "Buy running shoes")

### Habit Count Guidelines
- Simple goals (e.g., "Run a 5K"): 1-2 habits max
- Medium goals (e.g., "Get fit for a marathon"): 2-3 habits max
- Complex goals (e.g., "Complete career change"): 2-4 habits max
- NEVER exceed 4 habits per goal

### Weekly Distribution
Spread habits across the week so the user only sees 1-2 habits per goal on any given day:
- Use "custom" frequency with specific daysOfWeek to alternate habits
- Use "timesPerWeek" for flexibility
- The core habit gets the most days; supporting habits get fewer
- Example for "Run a 5K": Core habit "Run" on Mon/Wed/Sat (custom), Support habit "Strength training" on Tue/Thu (custom)

### Fold Sub-Steps Into Trigger/Notes
Instead of creating a separate "Warm up" habit, put it in the trigger field:
- trigger: "After putting on running shoes, do 5 min dynamic stretches then start running"
- This keeps the habit list clean while still guiding the user

## Guidelines for Habit Suggestions

### 1. Start Small
- For beginners: Recommend "embarrassingly small" habits (2-5 minutes)
- For intermediate: Moderate habits (10-20 minutes)
- For advanced: Challenging but sustainable habits (20-45 minutes)

### 2. Consider Constraints
- Respect the user's daily time availability
- Account for any constraints they mention (injuries, schedule, etc.)
- Factor in their preferences

### 3. Use Implementation Intentions
- Specify WHERE and WHEN for each habit
- Use habit stacking when appropriate (tie new habits to existing routines)
- Put warm-ups, preparation steps, and cool-downs in the trigger field

### 4. Category Mapping
Map the goal category to appropriate habit categories:
- fitness/health goals -> "health" habits
- learning/creative goals -> "mind" habits
- career goals -> "career" habits
- financial goals -> "life" habits

### 5. XP Rewards
Assign XP based on difficulty/time commitment:
- 10 XP: Quick tasks (under 5 minutes)
- 15 XP: Regular tasks (5-15 minutes)
- 20 XP: Challenging tasks (15-30 minutes)
- 25 XP: Major commitments (30+ minutes)

### 6. Progressive Phases
Create 2-4 phases that gradually increase difficulty:
- Phase 1 (weeks 1-2): Foundation building, minimal time commitment
- Phase 2 (weeks 3-4): Slight increase in duration or intensity
- Phase 3 (weeks 5-8): Full habit with variations
- Phase 4 (weeks 9+): Maintenance and optimization

### 7. Milestones
Create 3-5 checkpoints tied to weeks, not specific dates:
- Early milestone (week 2): First habit established
- Mid milestone (week 4): Pattern visible
- Progress milestone (week 6-8): Measurable progress
- Goal milestone (final): Goal achieved or major progress

### 8. Warnings
If the goal seems unrealistic given the timeline or constraints, provide gentle warnings.

## Output Format
You MUST respond with valid JSON only. No markdown, no explanation, just the JSON object.

{
  "suggestedHabits": [
    {
      "name": "string - action-oriented habit name",
      "category": "health" | "career" | "mind" | "life",
      "xpReward": 10 | 15 | 20 | 25,
      "frequency": {
        "type": "daily" | "weekdays" | "weekends" | "custom" | "timesPerWeek",
        "daysOfWeek": [0-6 array for custom],
        "timesPerWeek": number for timesPerWeek type
      },
      "timeOfDay": "morning" | "afternoon" | "evening" | "anytime",
      "location": "string - optional, where to do this",
      "trigger": "string - optional, what triggers this habit",
      "rationale": "string - 1-2 sentences explaining why this habit helps",
      "citation": {
        "author": "string - researcher/author name",
        "year": number,
        "finding": "string - brief research finding"
      }
    }
  ],
  "milestones": [
    {
      "title": "string - short milestone name",
      "targetWeek": number,
      "description": "string - what success looks like"
    }
  ],
  "phases": [
    {
      "weekStart": number,
      "weekEnd": number,
      "description": "string - what changes in this phase",
      "habitProgressions": [
        {
          "habitName": "string - original habit name",
          "newName": "string - evolved habit name for this phase",
          "newXpReward": number (optional - new XP if difficulty increases)
        }
      ]
    }
  ],
  "warnings": ["string - optional array of warnings if goal seems unrealistic"]
}`;

// ============================================
// Fallback Questions
// ============================================
function getFallbackQuestions(category: GoalCategory): ContextQuestion[] {
  const fallbacks: Record<GoalCategory, ContextQuestion[]> = {
    fitness: [
      {
        id: "fitness-level",
        question: "What is your current fitness level?",
        type: "select",
        options: [
          "Just starting out",
          "Occasionally active",
          "Regularly active",
          "Very fit",
        ],
      },
      {
        id: "fitness-constraints",
        question: "Any physical constraints we should know about?",
        type: "text",
        placeholder: "e.g., knee injury, back pain, asthma...",
      },
    ],
    learning: [
      {
        id: "learning-experience",
        question: "What is your prior experience with this subject?",
        type: "select",
        options: ["Complete beginner", "Some exposure", "Intermediate", "Advanced"],
      },
      {
        id: "learning-style",
        question: "How do you learn best?",
        type: "multiselect",
        options: [
          "Reading/text",
          "Video tutorials",
          "Hands-on practice",
          "Discussion with others",
        ],
      },
    ],
    career: [
      {
        id: "career-situation",
        question: "What is your current work situation?",
        type: "select",
        options: [
          "Student",
          "Employed full-time",
          "Employed part-time",
          "Self-employed",
          "Between jobs",
        ],
      },
      {
        id: "career-skills",
        question: "What specific skills are you looking to develop?",
        type: "text",
        placeholder: "e.g., leadership, public speaking, technical skills...",
      },
    ],
    health: [
      {
        id: "health-current",
        question: "What is your current health routine like?",
        type: "text",
        placeholder: "e.g., sleep schedule, diet habits, stress management...",
      },
      {
        id: "health-focus",
        question: "Which areas do you want to focus on?",
        type: "multiselect",
        options: [
          "Sleep quality",
          "Nutrition",
          "Stress management",
          "Mental health",
        ],
      },
    ],
    creative: [
      {
        id: "creative-medium",
        question: "What creative medium are you working in?",
        type: "text",
        placeholder: "e.g., writing, music, visual art, design...",
      },
      {
        id: "creative-experience",
        question: "How would you describe your experience level?",
        type: "select",
        options: ["Just starting", "Hobbyist", "Intermediate", "Professional"],
      },
    ],
    financial: [
      {
        id: "financial-situation",
        question: "What is your primary income type?",
        type: "select",
        options: [
          "Salary/wages",
          "Self-employed",
          "Variable income",
          "Investment income",
          "Student",
        ],
      },
      {
        id: "financial-focus",
        question: "What financial areas do you want to improve?",
        type: "multiselect",
        options: ["Budgeting", "Saving", "Investing", "Debt reduction"],
      },
    ],
  };

  return fallbacks[category] || fallbacks.learning;
}

// ============================================
// Validation Helpers
// ============================================
function validateQuestionType(
  type: string
): "text" | "select" | "multiselect" {
  const valid = ["text", "select", "multiselect"];
  return valid.includes(type) ? (type as "text" | "select" | "multiselect") : "text";
}

function validateHabitCategory(category: string): HabitCategory | null {
  const valid: HabitCategory[] = ["health", "career", "mind", "life"];
  return valid.includes(category as HabitCategory)
    ? (category as HabitCategory)
    : null;
}

function validateXpReward(xp: number): number {
  const valid = [10, 15, 20, 25];
  return valid.includes(xp) ? xp : 15;
}

type FrequencyType = "daily" | "weekdays" | "weekends" | "custom" | "timesPerWeek";

function validateFrequency(freq: any): {
  type: FrequencyType;
  daysOfWeek?: number[];
  timesPerWeek?: number;
} {
  const validTypes: FrequencyType[] = [
    "daily",
    "weekdays",
    "weekends",
    "custom",
    "timesPerWeek",
  ];
  if (!freq || !validTypes.includes(freq.type)) {
    return { type: "daily" };
  }
  return freq;
}

type TimeOfDay = "morning" | "afternoon" | "evening" | "anytime";

function validateTimeOfDay(tod: string): TimeOfDay {
  const valid: TimeOfDay[] = ["morning", "afternoon", "evening", "anytime"];
  return valid.includes(tod as TimeOfDay) ? (tod as TimeOfDay) : "anytime";
}

// ============================================
// Action 1: Generate Context Questions
// ============================================
export const generateContextQuestions = action({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    category: goalCategoryValidator,
    targetDate: v.string(),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.warn("ANTHROPIC_API_KEY not set — returning fallback questions");
      return { questions: getFallbackQuestions(args.category) };
    }

    // Calculate timeline
    const targetDate = new Date(args.targetDate);
    const today = new Date();
    const weeksUntilDeadline = Math.ceil(
      (targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 7)
    );

    const userMessage = `Generate 2-3 contextual questions for this goal:

**Goal Title**: ${args.title}
**Description**: ${args.description || "Not provided"}
**Category**: ${args.category}
**Timeline**: ${weeksUntilDeadline} weeks

Focus on questions that will help create a more personalized and effective habit plan. The questions should uncover:
1. The user's current ability or experience level related to this goal
2. Any constraints, limitations, or resources they have
3. Preferences or circumstances that would affect which habits work best for them

Respond with ONLY valid JSON.`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 500,
          system: QUESTIONS_SYSTEM_PROMPT,
          messages: [{ role: "user", content: userMessage }],
        }),
      });

      if (!response.ok) {
        console.error(
          `Anthropic API error: ${response.status} ${response.statusText}`
        );
        return { questions: getFallbackQuestions(args.category) };
      }

      const data = await response.json();

      // Extract text content
      const textContent = data.content?.find(
        (block: any) => block.type === "text"
      );
      if (!textContent?.text) {
        console.error("No text content in Anthropic response");
        return { questions: getFallbackQuestions(args.category) };
      }

      // Parse JSON response
      let parsedResponse: { questions: ContextQuestion[] };
      try {
        // Try to extract JSON if wrapped in code blocks
        const jsonMatch = textContent.text.match(
          /```(?:json)?\s*([\s\S]*?)\s*```/
        );
        const jsonString = jsonMatch ? jsonMatch[1] : textContent.text;
        parsedResponse = JSON.parse(jsonString.trim());
      } catch (parseError) {
        console.error("Failed to parse AI response:", parseError);
        return { questions: getFallbackQuestions(args.category) };
      }

      // Validate and sanitize the response
      const validatedQuestions: ContextQuestion[] = (
        parsedResponse.questions || []
      )
        .slice(0, 3)
        .map((q: any, index: number) => ({
          id: q.id || `q-${Date.now()}-${index}`,
          question: q.question || "Tell us more about your situation",
          type: validateQuestionType(q.type),
          options: q.type !== "text" ? q.options?.slice(0, 5) : undefined,
          placeholder: q.type === "text" ? q.placeholder : undefined,
        }));

      return {
        questions:
          validatedQuestions.length > 0
            ? validatedQuestions
            : getFallbackQuestions(args.category),
      };
    } catch (error) {
      console.error("Goal questions action error:", error);
      return { questions: getFallbackQuestions(args.category) };
    }
  },
});

// ============================================
// Action 2: Generate Goal Habits
// ============================================
export const generateGoalHabits = action({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    category: goalCategoryValidator,
    targetDate: v.string(),
    currentLevel: goalLevelValidator,
    dailyTimeAvailable: v.number(),
    contextAnswers: v.array(
      v.object({
        question: v.string(),
        answer: v.string(),
      })
    ),
    existingHabitNames: v.array(v.string()),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable not configured");
    }

    // Calculate timeline
    const targetDate = new Date(args.targetDate);
    const today = new Date();
    const weeksUntilDeadline = Math.ceil(
      (targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 7)
    );

    // Build context section from Q&A pairs
    const contextSection =
      args.contextAnswers.length > 0
        ? `## Additional Context\n${args.contextAnswers.map((a) => `**Q**: ${a.question}\n**A**: ${a.answer}`).join("\n\n")}`
        : "## Additional Context\nNo additional context provided.";

    const existingHabitNames =
      args.existingHabitNames.join(", ") || "None";

    const userMessage = `## Goal Details
**Title**: ${args.title}
**Description**: ${args.description || "Not provided"}
**Category**: ${args.category}
**Target Date**: ${args.targetDate} (${weeksUntilDeadline} weeks from now)

## User Context
**Current Level**: ${args.currentLevel}
**Daily Time Available**: ${args.dailyTimeAvailable} minutes

${contextSection}

## Existing Habits
${existingHabitNames}

---

Please create a progressive habit plan to help achieve this goal. Remember:
1. Don't duplicate existing habits
2. Keep total daily time commitment within ${args.dailyTimeAvailable} minutes
3. Create ${Math.min(Math.max(2, Math.floor(weeksUntilDeadline / 4)), 4)} phases for the ${weeksUntilDeadline}-week timeline
4. QUALITY OVER QUANTITY: Only suggest habits that are genuinely distinct activities. For a simple goal, 1-2 habits is ideal. Never exceed 4.
5. SPREAD ACROSS THE WEEK: Use custom frequency/daysOfWeek so the user only sees 1-2 habits per goal on any given day
6. FOLD SUB-STEPS: Warm-ups, cool-downs, prep work go in the trigger field, NOT as separate habits
7. Use the additional context answers to personalize the habits (e.g., if they mentioned injuries, suggest low-impact exercises)
8. Respond with ONLY valid JSON, no other text`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 2000,
          system: HABITS_SYSTEM_PROMPT,
          messages: [{ role: "user", content: userMessage }],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Anthropic API error: ${response.status} ${response.statusText}`,
          errorText
        );
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Extract text content
      const textContent = data.content?.find(
        (block: any) => block.type === "text"
      );
      if (!textContent?.text) {
        throw new Error("No text content in Anthropic response");
      }

      // Parse JSON response
      let parsedResponse: any;
      try {
        const jsonMatch = textContent.text.match(
          /```(?:json)?\s*([\s\S]*?)\s*```/
        );
        const jsonString = jsonMatch ? jsonMatch[1] : textContent.text;
        parsedResponse = JSON.parse(jsonString.trim());
      } catch (parseError) {
        console.error("Failed to parse AI response:", parseError);
        console.error("Raw response:", textContent.text.substring(0, 500));
        throw new Error("Failed to parse habit suggestions");
      }

      // Validate and sanitize the response
      const goalCategory = args.category as GoalCategory;
      const validatedResponse = {
        suggestedHabits: (parsedResponse.suggestedHabits || []).map(
          (habit: any) => ({
            name: habit.name || "Unnamed Habit",
            category:
              validateHabitCategory(habit.category) ||
              GOAL_TO_HABIT_CATEGORY[goalCategory],
            xpReward: validateXpReward(habit.xpReward),
            frequency: validateFrequency(habit.frequency),
            timeOfDay: validateTimeOfDay(habit.timeOfDay),
            location: habit.location,
            trigger: habit.trigger,
            rationale: habit.rationale || "This habit supports your goal.",
            citation: habit.citation,
          })
        ),
        milestones: (parsedResponse.milestones || []).map((milestone: any) => ({
          title: milestone.title || "Milestone",
          targetWeek: milestone.targetWeek || 1,
          description: milestone.description || "",
        })),
        phases: (parsedResponse.phases || []).map((phase: any) => ({
          weekStart: phase.weekStart || 1,
          weekEnd: phase.weekEnd || 2,
          description: phase.description || "",
          habitProgressions: (phase.habitProgressions || []).map((p: any) => ({
            habitName: p.habitName || "",
            newName: p.newName || "",
            newXpReward: p.newXpReward,
          })),
        })),
        warnings: parsedResponse.warnings || [],
      };

      return validatedResponse;
    } catch (error) {
      console.error("Goal habits action error:", error);
      throw error;
    }
  },
});
