"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { api } from "./_generated/api";

/**
 * Memory Extraction System
 *
 * Extracts persistent learnings about users from their journal entries and chat sessions.
 * Uses Claude Haiku for cost efficiency, runs batched (every 5 entries/messages).
 */

// Type for extracted memories
interface ExtractedMemory {
  category:
    | "preference"
    | "goal"
    | "blocker"
    | "motivation"
    | "context"
    | "strategy"
    | "insight";
  content: string;
  confidence: number;
}

// Journal entry type (simplified for extraction)
interface JournalEntryForExtraction {
  gratitudes: string[];
  improvement?: string;
  content?: string;
  mood?: "great" | "good" | "okay" | "rough";
  entryType?: "daily" | "weekly";
  weekHighlights?: string;
  weekChallenges?: string;
  nextWeekGoals?: string;
  _creationTime: number;
}

const VALID_CATEGORIES = [
  "preference",
  "goal",
  "blocker",
  "motivation",
  "context",
  "strategy",
  "insight",
] as const;

const EXTRACTION_SYSTEM_PROMPT = `You are a memory extraction system. Your job is to analyze user journal entries or chat messages and extract ONLY persistent, meaningful learnings about this user. Focus on patterns that appear across multiple entries or reveal deep truths about who they are.

Rules:
1. Only extract if confidence > 0.6 (you're fairly certain this is a persistent trait/pattern)
2. Skip temporary states ("had a rough day") - focus on lasting patterns
3. Look for: recurring themes, consistent struggles, stable preferences, life context clues, motivational patterns
4. Be specific - "struggles with consistency on weekends" is better than "has trouble with habits"
5. Extract 0-5 memories (quality over quantity - only extract genuinely useful insights)

Categories:
- preference: Stable preferences (e.g., "prefers morning workouts", "values quiet time")
- goal: Goals/aspirations mentioned (e.g., "wants to run a marathon")
- blocker: Recurring challenges (e.g., "work stress affects evening habits")
- motivation: What drives them (e.g., "motivated by family health")
- context: Life context (e.g., "works from home", "has young children")
- strategy: What works for them (e.g., "habit stacking with coffee is effective")
- insight: Patterns about their behavior (e.g., "mood drops precede habit breaks")

Respond with ONLY a JSON array (no markdown, no explanation):
[{"category": "blocker", "content": "Struggles with consistency on weekends - completion drops significantly", "confidence": 0.75}]

If no meaningful patterns found, respond with: []`;

/**
 * Extract memories from recent journal entries using AI
 */
export const extractMemoriesFromJournal = internalAction({
  args: {
    userId: v.id("users"),
    entries: v.array(v.any()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string; memoriesExtracted?: number }> => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error("ANTHROPIC_API_KEY not configured for memory extraction");
      return { success: false, error: "API key not configured" };
    }

    const entries = args.entries as JournalEntryForExtraction[];
    if (entries.length === 0) {
      return { success: false, error: "No entries to process" };
    }

    // Format entries for the prompt
    const formattedEntries = entries.map((e, i) => {
      const date = new Date(e._creationTime).toISOString().split("T")[0];
      let text = `Entry ${i + 1} (${date}, mood: ${e.mood || "unknown"}):\n`;

      if (e.gratitudes?.length > 0) {
        text += `  Gratitudes: ${e.gratitudes.filter((g) => g).join("; ")}\n`;
      }
      if (e.improvement) {
        text += `  Could be better: ${e.improvement}\n`;
      }
      if (e.content) {
        text += `  Thoughts: ${e.content}\n`;
      }
      if (e.weekHighlights) {
        text += `  Week highlights: ${e.weekHighlights}\n`;
      }
      if (e.weekChallenges) {
        text += `  Week challenges: ${e.weekChallenges}\n`;
      }
      if (e.nextWeekGoals) {
        text += `  Next week goals: ${e.nextWeekGoals}\n`;
      }

      return text;
    });

    // Fetch existing memories so the AI knows what's already been extracted
    const existingMemories = await ctx.runQuery(api.chat.getMemories, {
      userId: args.userId,
    });

    const existingContext =
      existingMemories.length > 0
        ? `\n\nAlready known about this user (do NOT re-extract these):\n${existingMemories.map((m: { category: string; content: string }) => `- [${m.category}] ${m.content}`).join("\n")}`
        : "";

    const contextString = `Analyze these journal entries and extract persistent learnings:\n\n${formattedEntries.join("\n")}${existingContext}`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 500,
          system: EXTRACTION_SYSTEM_PROMPT,
          messages: [{ role: "user", content: contextString }],
        }),
      });

      if (!response.ok) {
        console.error(
          `Anthropic API error: ${response.status} ${response.statusText}`
        );
        return { success: false, error: `API error: ${response.status}` };
      }

      const data = await response.json();
      const textBlock = data.content?.find(
        (block: { type: string }) => block.type === "text"
      );
      const responseText = textBlock?.text ?? "";

      // Parse the JSON response
      let memories: ExtractedMemory[] = [];
      try {
        const cleaned = responseText
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
        memories = JSON.parse(cleaned);
      } catch {
        console.error(
          "Failed to parse memory extraction response:",
          responseText
        );
        return { success: false, error: "Failed to parse AI response" };
      }

      // Validate and filter memories
      const validMemories = memories.filter(
        (m) =>
          m &&
          typeof m.content === "string" &&
          m.content.length > 0 &&
          typeof m.confidence === "number" &&
          m.confidence >= 0.6 &&
          VALID_CATEGORIES.includes(
            m.category as (typeof VALID_CATEGORIES)[number]
          )
      );

      if (validMemories.length === 0) {
        return { success: true, memoriesExtracted: 0 };
      }

      // Save memories via the public saveMemories mutation (handles deduplication)
      await ctx.runMutation(api.chat.saveMemories, {
        userId: args.userId,
        memories: validMemories.map((m) => ({
          category: m.category as
            | "preference"
            | "goal"
            | "blocker"
            | "motivation"
            | "context"
            | "strategy"
            | "insight",
          content: m.content.slice(0, 500),
          source: "journal" as const,
          confidence: Math.min(1, Math.max(0, m.confidence)),
        })),
      });

      return { success: true, memoriesExtracted: validMemories.length };
    } catch (error) {
      console.error("Memory extraction error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

/**
 * Extract memories from chat messages using AI
 */
export const extractMemoriesFromChat = internalAction({
  args: {
    userId: v.id("users"),
    messages: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
      })
    ),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string; memoriesExtracted?: number }> => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error("ANTHROPIC_API_KEY not configured for memory extraction");
      return { success: false, error: "API key not configured" };
    }

    if (args.messages.length === 0) {
      return { success: false, error: "No messages to process" };
    }

    // Format messages for the prompt
    const formattedMessages = args.messages
      .map(
        (m) =>
          `${m.role === "user" ? "User" : "Coach"}: ${m.content}`
      )
      .join("\n\n");

    // Fetch existing memories to avoid re-extraction
    const existingMemories = await ctx.runQuery(api.chat.getMemories, {
      userId: args.userId,
    });

    const existingContext =
      existingMemories.length > 0
        ? `\n\nAlready known about this user (do NOT re-extract these):\n${existingMemories.map((m: { category: string; content: string }) => `- [${m.category}] ${m.content}`).join("\n")}`
        : "";

    const contextString = `Analyze this coaching conversation and extract persistent learnings about the user (focus on what the USER reveals, not the coach's advice):\n\n${formattedMessages}${existingContext}`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 500,
          system: EXTRACTION_SYSTEM_PROMPT,
          messages: [{ role: "user", content: contextString }],
        }),
      });

      if (!response.ok) {
        console.error(
          `Anthropic API error: ${response.status} ${response.statusText}`
        );
        return { success: false, error: `API error: ${response.status}` };
      }

      const data = await response.json();
      const textBlock = data.content?.find(
        (block: { type: string }) => block.type === "text"
      );
      const responseText = textBlock?.text ?? "";

      // Parse the JSON response
      let memories: ExtractedMemory[] = [];
      try {
        const cleaned = responseText
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
        memories = JSON.parse(cleaned);
      } catch {
        console.error(
          "Failed to parse memory extraction response:",
          responseText
        );
        return { success: false, error: "Failed to parse AI response" };
      }

      // Validate and filter memories
      const validMemories = memories.filter(
        (m) =>
          m &&
          typeof m.content === "string" &&
          m.content.length > 0 &&
          typeof m.confidence === "number" &&
          m.confidence >= 0.6 &&
          VALID_CATEGORIES.includes(
            m.category as (typeof VALID_CATEGORIES)[number]
          )
      );

      if (validMemories.length === 0) {
        return { success: true, memoriesExtracted: 0 };
      }

      // Save memories via the public saveMemories mutation (handles deduplication)
      await ctx.runMutation(api.chat.saveMemories, {
        userId: args.userId,
        memories: validMemories.map((m) => ({
          category: m.category as
            | "preference"
            | "goal"
            | "blocker"
            | "motivation"
            | "context"
            | "strategy"
            | "insight",
          content: m.content.slice(0, 500),
          source: "chat" as const,
          confidence: Math.min(1, Math.max(0, m.confidence)),
        })),
      });

      return { success: true, memoriesExtracted: validMemories.length };
    } catch (error) {
      console.error("Memory extraction from chat error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
