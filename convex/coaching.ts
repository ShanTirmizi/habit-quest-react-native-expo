"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

// Fallback response when API fails or data is insufficient
const FALLBACK_INSIGHTS = {
  primaryInsight: {
    title: "Building Your Foundation",
    body: "You're in the early stages of your habit journey. Research shows that simply tracking habits increases completion rates by 40%. Keep showing up!",
    category: "strategy" as const,
    actionable: "Focus on completing just one habit today to build momentum.",
  },
  secondaryInsights: [
    {
      title: "Consistency Over Perfection",
      body: "Studies show habit formation takes an average of 66 days. Don't aim for perfection — aim for presence.",
      category: "streak" as const,
    },
  ],
  todayFocus: "Complete your most important habit first thing today.",
};

const INSUFFICIENT_DATA_INSIGHTS = {
  primaryInsight: {
    title: "Your Story Is Just Beginning",
    body: "Keep building habits and I'll have personalized insights for you soon! I need a bit more data to find meaningful patterns in your behavior.",
    category: "strategy" as const,
    actionable: "Add a few habits and start completing them — I'll be watching for patterns.",
  },
  secondaryInsights: [
    {
      title: "Data Fuels Insight",
      body: "The more consistently you track, the sharper my analysis becomes. Even small daily completions give me something to work with.",
      category: "pattern" as const,
    },
  ],
  todayFocus: "Keep building habits and I'll have personalized insights for you soon!",
};

export const generateInsights = action({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // 1. Fetch user data via ctx.runQuery
    const [habits, progress, journalEntries, memories] = await Promise.all([
      ctx.runQuery(api.habits.getHabits, { userId: args.userId }),
      ctx.runQuery(api.progress.getProgress, { userId: args.userId }),
      ctx.runQuery(api.journal.getEntries, { userId: args.userId }),
      ctx.runQuery(api.chat.getMemories, { userId: args.userId }),
    ]);

    // Take first 20 journal entries (already ordered desc)
    const recentJournal = journalEntries.slice(0, 20);

    // Check for insufficient data
    const totalCompletions = habits.reduce(
      (sum: number, h: any) => sum + (h.completedDates?.length ?? 0),
      0
    );

    if (habits.length < 1 || totalCompletions < 3) {
      return INSUFFICIENT_DATA_INSIGHTS;
    }

    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn("ANTHROPIC_API_KEY not set — returning fallback insights");
      return FALLBACK_INSIGHTS;
    }

    // 2. Build coaching context string from the data
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

    // Habit summaries
    const habitSummaries = habits.map((h: any) => {
      const last7 = (h.completedDates ?? []).filter(
        (d: string) => d >= sevenDaysAgoStr
      ).length;
      return `- ${h.name} [${h.category}]: streak=${h.streak}, last7days=${last7}/${7}, totalCompletions=${(h.completedDates ?? []).length}, timeOfDay=${h.timeOfDay ?? "anytime"}`;
    });

    // Progress summary
    const progressSummary = progress
      ? `Level ${progress.level}, XP: ${progress.totalXp}, HP: ${progress.currentHp}/${progress.maxHp}, Faint count: ${progress.faintCount}`
      : "No progress data yet";

    // Journal summaries (last 5)
    const journalSummaries = recentJournal.slice(0, 5).map((j: any) => {
      const date = j.entryDate ?? new Date(j._creationTime).toISOString().split("T")[0];
      const gratitudePreview =
        j.gratitudes.length > 0
          ? j.gratitudes.slice(0, 2).join("; ")
          : "none";
      const achievementsPreview = j.achievements && j.achievements.length > 0
        ? j.achievements.join("; ")
        : null;
      return `- ${date}: mood=${j.mood ?? "unset"}, gratitudes="${gratitudePreview}"${achievementsPreview ? `, achievements="${achievementsPreview}"` : ""}, type=${j.entryType ?? "daily"}`;
    });

    // AI memories (filtered to confidence >= 0.5)
    const relevantMemories = (memories ?? [])
      .filter((m: any) => m.confidence >= 0.5)
      .map((m: any) => `- [${m.category}] ${m.content} (confidence: ${m.confidence})`);

    const userContext = [
      "=== HABIT DATA ===",
      `Total habits: ${habits.length}`,
      `Total completions (all time): ${totalCompletions}`,
      ...habitSummaries,
      "",
      "=== PROGRESS ===",
      progressSummary,
      "",
      "=== RECENT JOURNAL (last 5) ===",
      journalSummaries.length > 0
        ? journalSummaries.join("\n")
        : "No journal entries yet",
      "",
      "=== AI MEMORIES ===",
      relevantMemories.length > 0
        ? relevantMemories.join("\n")
        : "No memories stored yet",
      "",
      `Today's date: ${now.toISOString().split("T")[0]}`,
    ].join("\n");

    // 3. Build the system prompt (Dr. Sage persona)
    const systemPrompt = `You are Dr. Sage, an AI behavioral scientist and personal habit coach within HabitQuest. You analyze user habit data and provide evidence-based insights grounded in peer-reviewed research.

Your personality:
- Warm, encouraging, intellectually rigorous
- Always reference the user's ACTUAL data (never generic advice)
- Growth mindset framing
- Direct but compassionate

You must look for CORRELATIONS between:
- Mood and habit completion patterns
- Category performance across days
- Streak patterns and what breaks them
- Time-of-day drift
- Recovery patterns after bad days

Ground your insights in research:
- Lally et al. (2010): Habit automaticity takes ~66 days
- Wood & Runger (2016): 43% of daily behaviors are habitual
- Gollwitzer & Sheeran (2006): Implementation intentions double success
- Baumeister et al. (2007): Willpower depletes; morning decisions stronger
- Dweck (2006): Growth mindset drives persistence

RESPOND WITH VALID JSON ONLY (no markdown, no code fences):
{
  "primaryInsight": {
    "title": "Short headline (5-10 words)",
    "body": "2-3 sentences with specific numbers from the user's data",
    "category": "pattern|streak|mood|strategy|celebration|recovery",
    "actionable": "One concrete thing to try today"
  },
  "secondaryInsights": [
    { "title": "...", "body": "...", "category": "..." },
    { "title": "...", "body": "...", "category": "..." }
  ],
  "todayFocus": "One clear sentence about what to prioritize today"
}`;

    // 4. Call the Anthropic API
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY!,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1500,
          system: systemPrompt,
          messages: [{ role: "user", content: userContext }],
        }),
      });

      if (!response.ok) {
        console.error(
          `Anthropic API error: ${response.status} ${response.statusText}`
        );
        return FALLBACK_INSIGHTS;
      }

      const data = await response.json();

      // 5. Parse the response — extract JSON from text content
      const textContent = data.content?.find(
        (block: any) => block.type === "text"
      );
      if (!textContent?.text) {
        console.error("No text content in Anthropic response");
        return FALLBACK_INSIGHTS;
      }

      let parsed;
      try {
        // Try direct JSON parse first
        parsed = JSON.parse(textContent.text);
      } catch {
        // Try extracting JSON from potential markdown code fences
        const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[0]);
          } catch {
            console.error(
              "Failed to parse extracted JSON from response:",
              textContent.text.substring(0, 200)
            );
            return FALLBACK_INSIGHTS;
          }
        } else {
          console.error(
            "No JSON found in response:",
            textContent.text.substring(0, 200)
          );
          return FALLBACK_INSIGHTS;
        }
      }

      // Validate the parsed response has the expected shape
      if (!parsed.primaryInsight || !parsed.secondaryInsights || !parsed.todayFocus) {
        console.error("Parsed response missing required fields");
        return FALLBACK_INSIGHTS;
      }

      // 6. Update the progress record with lastCoachingDate
      try {
        await ctx.runMutation(api.progress.updateCoachingDate, {
          userId: args.userId,
        });
      } catch (e) {
        // Non-critical — log but don't fail the whole action
        console.warn("Failed to update coaching date:", e);
      }

      // 7. Return the parsed insights object
      return parsed;
    } catch (error) {
      console.error("Error calling Anthropic API:", error);
      return FALLBACK_INSIGHTS;
    }
  },
});
