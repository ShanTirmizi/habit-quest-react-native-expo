"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";

// Dr. Sage chat system prompt — conversational version (not JSON output)
const CHAT_SYSTEM_PROMPT = `You are Dr. Sage, an AI behavioral scientist and personal habit coach within HabitQuest.

## Your Personality
- Warm, encouraging, and intellectually rigorous
- Use the user's ACTUAL data to personalize every response — never give generic advice
- Direct but compassionate when pointing out patterns that aren't serving them
- Growth mindset framing: setbacks are data, not failure
- Keep responses concise (2-4 sentences typically, more when the user asks deep questions)
- You speak like a wise, friendly mentor — not a robot

## Scientific Foundations You Apply
Ground your advice in research when relevant (cite naturally, don't lecture):
- **Lally et al. (2010)**: Habit automaticity takes ~66 days; missing one day doesn't derail progress
- **Wood & Runger (2016)**: 43% of daily behaviors are habitual; context stability is crucial
- **Gollwitzer & Sheeran (2006)**: "If-then" planning doubles goal success rates
- **Baumeister et al. (2007)**: Willpower depletes with use; morning decisions are stronger
- **Dweck (2006)**: Growth mindset drives persistence after setbacks
- **Deci & Ryan (2000)**: Intrinsic motivation outperforms extrinsic
- **Fredrickson (2001)**: Positive emotions expand thought-action repertoires
- **Clear (2018)**: Atomic Habits — Four Laws, 2-minute rule, identity-based habits
- **Duhigg (2012)**: Keystone habits trigger positive cascades
- **Fogg (2019)**: Tiny Habits — B=MAP, start embarrassingly small

## THE ORACLE: Pattern Recognition
Look for correlations in user data:
- Mood-habit connections (rough days → missed habits?)
- Day-of-week patterns (weekends weaker?)
- Keystone habits (does completing one predict others?)
- Stress cascades (missing one habit → missing more?)
- Time-of-day drift (evening habits consistently missed?)
- Journal themes (recurring blockers, unmet desires)

## Rules
- NEVER give medical or mental health diagnoses
- NEVER shame or guilt-trip about missed habits
- NEVER invent data — only reference what's in their context
- Keep it conversational — you're chatting, not writing a report
- When citing research, weave it in naturally ("Research shows..." not "According to Lally et al. (2010)...")
- Reference their specific habits, streaks, and patterns by name`;

// Build memory context section
function buildMemoryContext(memories: any[]): string {
  if (!memories || memories.length === 0) return "";

  const sorted = [...memories]
    .filter((m: any) => m.confidence >= 0.5)
    .sort(
      (a: any, b: any) =>
        b.confidence * b.reinforcementCount -
        a.confidence * a.reinforcementCount
    );

  if (sorted.length === 0) return "";

  const categoryOrder = [
    { key: "goal", label: "Goals & Aspirations" },
    { key: "motivation", label: "What Motivates Them" },
    { key: "blocker", label: "Challenges & Blockers" },
    { key: "preference", label: "Preferences" },
    { key: "context", label: "Life Context" },
    { key: "strategy", label: "Strategies That Work" },
    { key: "insight", label: "Key Patterns" },
  ];

  const byCategory: Record<string, any[]> = {};
  for (const m of sorted) {
    if (!byCategory[m.category]) byCategory[m.category] = [];
    byCategory[m.category].push(m);
  }

  let ctx = "\n\n## What You Know About This User\n\n";

  for (const { key, label } of categoryOrder) {
    const items = byCategory[key];
    if (items && items.length > 0) {
      ctx += `**${label}:**\n`;
      for (const m of items) {
        const indicator =
          m.confidence >= 0.8 ? "●" : m.confidence >= 0.6 ? "◐" : "○";
        ctx += `${indicator} "${m.content}"`;
        if (m.reinforcementCount > 2)
          ctx += ` (reinforced ${m.reinforcementCount}x)`;
        ctx += "\n";
      }
      ctx += "\n";
    }
  }

  return ctx;
}

export const sendMessage = action({
  args: {
    userId: v.id("users"),
    userMessage: v.string(),
    sessionId: v.string(),
  },
  handler: async (ctx, args): Promise<string> => {
    // 1. Fetch context data in parallel
    const [habits, progress, journalEntries, memories, recentMessages] =
      await Promise.all([
        ctx.runQuery(api.habits.getHabits, { userId: args.userId }),
        ctx.runQuery(api.progress.getProgress, { userId: args.userId }),
        ctx.runQuery(api.journal.getEntries, { userId: args.userId }),
        ctx.runQuery(api.chat.getMemories, { userId: args.userId }),
        ctx.runQuery(api.chat.getRecentMessages, {
          userId: args.userId,
          limit: 20,
        }),
      ]);

    // 2. Save user message
    await ctx.runMutation(api.chat.saveMessage, {
      userId: args.userId,
      role: "user",
      content: args.userMessage,
      sessionId: args.sessionId,
    });

    // 3. Build user context
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

    const habitSummaries = (habits ?? []).map((h: any) => {
      const last7 = (h.completedDates ?? []).filter(
        (d: string) => d >= sevenDaysAgoStr
      ).length;
      const completedToday = (h.completedDates ?? []).includes(todayStr);
      return `- ${h.name} [${h.category}]: streak=${h.streak}, last7days=${last7}/7, ${completedToday ? "✓ done today" : "☐ pending today"}, timeOfDay=${h.timeOfDay ?? "anytime"}`;
    });

    const totalHabits = habits?.length ?? 0;
    const completedToday = (habits ?? []).filter((h: any) =>
      (h.completedDates ?? []).includes(todayStr)
    ).length;

    const progressSummary = progress
      ? `Level ${progress.level}, XP: ${progress.totalXp}, HP: ${progress.currentHp}/${progress.maxHp}`
      : "No progress yet";

    // Journal summaries (last 5)
    const recentJournal = (journalEntries ?? []).slice(0, 5);
    const journalSummaries = recentJournal.map((j: any) => {
      const date =
        j.entryDate ?? new Date(j._creationTime).toISOString().split("T")[0];
      const gratitudes =
        j.gratitudes?.length > 0
          ? j.gratitudes.slice(0, 2).join("; ")
          : "none";
      const improvement = j.improvement ? ` | improvement: "${j.improvement}"` : "";
      return `- ${date}: mood=${j.mood ?? "unset"}, gratitudes="${gratitudes}"${improvement}`;
    });

    const memoryContext = buildMemoryContext(memories ?? []);

    const userContext = [
      "=== USER'S HABIT DATA ===",
      `Total habits: ${totalHabits}, Completed today: ${completedToday}/${totalHabits}`,
      ...habitSummaries,
      "",
      `=== PROGRESS: ${progressSummary} ===`,
      "",
      "=== RECENT JOURNAL ===",
      journalSummaries.length > 0
        ? journalSummaries.join("\n")
        : "No journal entries yet",
      "",
      `Today: ${todayStr}`,
    ].join("\n");

    const systemPrompt = `${CHAT_SYSTEM_PROMPT}${memoryContext}

## Current User Context
${userContext}`;

    // 4. Build conversation history (last 10 messages for context window)
    const conversationHistory = (recentMessages ?? [])
      .slice(-10)
      .map((m: any) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    // Add the current user message
    conversationHistory.push({
      role: "user" as const,
      content: args.userMessage,
    });

    // 5. Call Claude API
    if (!process.env.ANTHROPIC_API_KEY) {
      const fallback =
        "I'm having trouble connecting right now. Try again in a moment!";
      await ctx.runMutation(api.chat.saveMessage, {
        userId: args.userId,
        role: "assistant",
        content: fallback,
        sessionId: args.sessionId,
      });
      return fallback;
    }

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
          max_tokens: 400,
          system: systemPrompt,
          messages: conversationHistory,
        }),
      });

      if (!response.ok) {
        console.error(
          `Anthropic API error: ${response.status} ${response.statusText}`
        );
        const fallback =
          "I'm having a moment — give me a second and try again!";
        await ctx.runMutation(api.chat.saveMessage, {
          userId: args.userId,
          role: "assistant",
          content: fallback,
          sessionId: args.sessionId,
        });
        return fallback;
      }

      const data = await response.json();
      const textBlock = data.content?.find(
        (block: any) => block.type === "text"
      );
      const reply = textBlock?.text ?? "Hmm, I lost my train of thought. Could you say that again?";

      // 6. Save assistant response
      await ctx.runMutation(api.chat.saveMessage, {
        userId: args.userId,
        role: "assistant",
        content: reply,
        sessionId: args.sessionId,
      });

      // 7. Trigger memory extraction check (runs async via scheduler in the mutation)
      try {
        await ctx.runMutation(internal.chat.triggerChatMemoryExtraction, {
          userId: args.userId,
          sessionId: args.sessionId,
        });
      } catch (e) {
        // Non-critical — log but don't fail the chat response
        console.warn("Failed to trigger chat memory extraction:", e);
      }

      return reply;
    } catch (error) {
      console.error("Error calling Anthropic API:", error);
      const fallback =
        "Something went wrong on my end. Try again in a moment!";
      await ctx.runMutation(api.chat.saveMessage, {
        userId: args.userId,
        role: "assistant",
        content: fallback,
        sessionId: args.sessionId,
      });
      return fallback;
    }
  },
});
