"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";

// ──────────────────────────────────────────────
// Tool definitions for Claude tool_use
// ──────────────────────────────────────────────

const TOOLS = [
  {
    name: "create_habits",
    description:
      "Create one or more habits for the user. Use when the user asks to add, create, or set up habits. You can batch-create multiple habits in one call.",
    input_schema: {
      type: "object" as const,
      properties: {
        habits: {
          type: "array" as const,
          description: "Array of habits to create",
          items: {
            type: "object" as const,
            properties: {
              name: {
                type: "string" as const,
                description: "Name of the habit (e.g., 'Morning meditation')",
              },
              category: {
                type: "string" as const,
                enum: ["health", "career", "mind", "life"],
                description:
                  "Category: health (exercise, nutrition, sleep), career (work, skills), mind (learning, mindfulness), life (social, hobbies, chores)",
              },
              xpReward: {
                type: "number" as const,
                description:
                  "XP reward for completing (10=tiny, 15=small, 20=medium, 25=challenging, 30=hard). Default 15.",
              },
              frequency: {
                type: "object" as const,
                description: "How often the habit should be done",
                properties: {
                  type: {
                    type: "string" as const,
                    enum: [
                      "daily",
                      "weekdays",
                      "weekends",
                      "custom",
                      "timesPerWeek",
                    ],
                  },
                  daysOfWeek: {
                    type: "array" as const,
                    description:
                      "For 'custom' type: array of day numbers (0=Sun, 1=Mon, ..., 6=Sat)",
                    items: { type: "number" as const },
                  },
                  timesPerWeek: {
                    type: "number" as const,
                    description: "For 'timesPerWeek' type: how many times per week",
                  },
                },
                required: ["type"],
              },
              timeOfDay: {
                type: "string" as const,
                enum: ["morning", "afternoon", "evening", "anytime"],
                description: "Best time of day for the habit. Default 'anytime'.",
              },
              location: {
                type: "string" as const,
                description:
                  "Where the habit is done (e.g., 'gym', 'home office', 'kitchen')",
              },
              trigger: {
                type: "string" as const,
                description:
                  "What triggers this habit — an existing routine or cue (e.g., 'After morning coffee', 'When I sit at my desk')",
              },
            },
            required: ["name", "category", "xpReward"],
          },
        },
      },
      required: ["habits"],
    },
  },
  {
    name: "create_medicines",
    description:
      "Create one or more medications/supplements for the user to track. Use when the user asks to add medications, meds, supplements, or vitamins.",
    input_schema: {
      type: "object" as const,
      properties: {
        medicines: {
          type: "array" as const,
          description: "Array of medications to create",
          items: {
            type: "object" as const,
            properties: {
              name: {
                type: "string" as const,
                description: "Medication name (e.g., 'Metformin')",
              },
              dosage: {
                type: "string" as const,
                description: "Dosage (e.g., '500mg', '10mg', '1000 IU')",
              },
              instructions: {
                type: "string" as const,
                description:
                  "Special instructions (e.g., 'Take with food', 'Do not crush')",
              },
              prescriber: {
                type: "string" as const,
                description: "Name of prescribing doctor",
              },
              scheduledTimes: {
                type: "array" as const,
                description:
                  "When to take the medication. Each entry has a label, time, and whether reminders are on.",
                items: {
                  type: "object" as const,
                  properties: {
                    label: {
                      type: "string" as const,
                      description:
                        "Label for this time slot (e.g., 'Morning', 'Evening', 'Bedtime')",
                    },
                    time: {
                      type: "string" as const,
                      description: "Time in HH:MM format (24h), e.g., '08:00', '20:00'",
                    },
                    reminderEnabled: {
                      type: "boolean" as const,
                      description: "Whether to send a reminder. Default true.",
                    },
                  },
                  required: ["label", "time", "reminderEnabled"],
                },
              },
            },
            required: ["name", "dosage", "scheduledTimes"],
          },
        },
      },
      required: ["medicines"],
    },
  },
  {
    name: "create_quests",
    description:
      "Create one or more side quests (one-off tasks or goals) for the user. Use when the user asks to add tasks, to-dos, quests, or goals.",
    input_schema: {
      type: "object" as const,
      properties: {
        quests: {
          type: "array" as const,
          description: "Array of quests to create",
          items: {
            type: "object" as const,
            properties: {
              title: {
                type: "string" as const,
                description: "Quest title (e.g., 'Finish portfolio website')",
              },
              description: {
                type: "string" as const,
                description: "Optional description or details about the quest",
              },
              xpReward: {
                type: "number" as const,
                description:
                  "XP reward (25=small task, 50=medium, 100=large project). Default 50.",
              },
              priority: {
                type: "string" as const,
                enum: ["low", "medium", "high"],
                description: "Priority level. Default 'medium'.",
              },
              questType: {
                type: "string" as const,
                enum: ["daily", "weekly", "ongoing"],
                description:
                  "Quest type: daily (do today), weekly (this week), ongoing (no deadline). Default 'ongoing'.",
              },
            },
            required: ["title", "xpReward", "priority"],
          },
        },
      },
      required: ["quests"],
    },
  },
  {
    name: "toggle_holiday_mode",
    description:
      "Start or end holiday/vacation mode for the user. When active, all habit streaks are frozen (protected), no HP damage occurs for missed habits, and no XP is earned. Use when the user says they're going on holiday, vacation, trip, taking a break, or wants to pause their habits. Also use to end holiday mode when they say they're back.",
    input_schema: {
      type: "object" as const,
      properties: {
        action: {
          type: "string" as const,
          enum: ["start", "end"],
          description: "Whether to start or end holiday mode",
        },
        endDate: {
          type: "string" as const,
          description:
            "Optional end date in YYYY-MM-DD format for auto-ending the holiday. Only used when action is 'start'. If the user says 'I'm away for a week', calculate the end date.",
        },
      },
      required: ["action"],
    },
  },
];

// ──────────────────────────────────────────────
// Dr. Sage system prompt
// ──────────────────────────────────────────────

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

## Actions You Can Take
You can create habits, medications, and quests for the user. You can also toggle holiday/vacation mode. Use your tools when the user asks you to add or create things, or when they mention going on holiday/vacation/break.

### Guidelines for Actions:
- Ask clarifying questions if critical info is missing (e.g., medication dosage, habit category)
- For medications: always confirm the name, dosage, and schedule before creating
- For habits: pick sensible defaults for category, xpReward, frequency, timeOfDay based on context
- You can batch-create multiple items in one tool call
- After creating items, confirm what was created in a friendly summary
- NEVER create items the user didn't ask for
- If unsure about details, ASK rather than guess
- When the user says "add my meds" or similar, infer schedule from context (e.g., "twice daily" = morning 08:00 + evening 20:00)
- For holiday mode: if the user mentions a duration (e.g., "gone for a week", "back on March 30"), calculate the end date. If no duration mentioned, start without an end date (they'll end it manually).
- When starting holiday mode, reassure them their streaks are safe
- When ending holiday mode, welcome them back warmly

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

// ──────────────────────────────────────────────
// Tool execution
// ──────────────────────────────────────────────

async function executeToolCall(
  ctx: any,
  userId: any,
  toolName: string,
  toolInput: any
): Promise<string> {
  switch (toolName) {
    case "create_habits": {
      const results: string[] = [];
      for (const habit of toolInput.habits) {
        try {
          await ctx.runMutation(api.habits.addHabit, {
            userId,
            name: habit.name,
            category: habit.category,
            xpReward: habit.xpReward ?? 15,
            frequency: habit.frequency,
            timeOfDay: habit.timeOfDay ?? "anytime",
            location: habit.location,
            trigger: habit.trigger,
          });
          results.push(`Created habit: "${habit.name}" [${habit.category}]`);
        } catch (e: any) {
          results.push(`Failed to create habit "${habit.name}": ${e.message}`);
        }
      }
      return results.join("\n");
    }

    case "create_medicines": {
      const results: string[] = [];
      for (const med of toolInput.medicines) {
        try {
          await ctx.runMutation(api.medicines.addMedicine, {
            userId,
            name: med.name,
            dosage: med.dosage,
            instructions: med.instructions,
            prescriber: med.prescriber,
            scheduledTimes: med.scheduledTimes.map((t: any) => ({
              label: t.label,
              time: t.time,
              reminderEnabled: t.reminderEnabled ?? true,
            })),
          });
          const schedule = med.scheduledTimes
            .map((t: any) => `${t.label} (${t.time})`)
            .join(", ");
          results.push(
            `Created medication: "${med.name}" ${med.dosage} — ${schedule}`
          );
        } catch (e: any) {
          results.push(
            `Failed to create medication "${med.name}": ${e.message}`
          );
        }
      }
      return results.join("\n");
    }

    case "create_quests": {
      const results: string[] = [];
      for (const quest of toolInput.quests) {
        try {
          await ctx.runMutation(api.quests.addQuest, {
            userId,
            title: quest.title,
            description: quest.description,
            xpReward: quest.xpReward ?? 50,
            priority: quest.priority ?? "medium",
            questType: quest.questType ?? "ongoing",
          });
          results.push(
            `Created quest: "${quest.title}" [${quest.priority ?? "medium"} priority, ${quest.xpReward ?? 50} XP]`
          );
        } catch (e: any) {
          results.push(
            `Failed to create quest "${quest.title}": ${e.message}`
          );
        }
      }
      return results.join("\n");
    }

    case "toggle_holiday_mode": {
      try {
        if (toolInput.action === "start") {
          const result = await ctx.runMutation(api.progress.startHoliday, {
            userId,
            endDate: toolInput.endDate,
          });
          return `Holiday mode activated! Start: ${result.startDate}${result.endDate ? `, Auto-end: ${result.endDate}` : " (no end date set — end manually)"}. Streaks are frozen and HP is protected.`;
        } else {
          await ctx.runMutation(api.progress.endHoliday, { userId });
          return "Holiday mode ended. Welcome back! Streaks resume from where they left off.";
        }
      } catch (e: any) {
        return `Failed to toggle holiday mode: ${e.message}`;
      }
    }

    default:
      return `Unknown tool: ${toolName}`;
  }
}

/** Extract human-readable item names from tool input for UI badges */
function extractItemNames(toolName: string, input: any): string[] {
  switch (toolName) {
    case "create_habits":
      return (input.habits ?? []).map((h: any) => h.name);
    case "create_medicines":
      return (input.medicines ?? []).map((m: any) =>
        m.dosage ? `${m.name} ${m.dosage}` : m.name
      );
    case "create_quests":
      return (input.quests ?? []).map((q: any) => q.title);
    case "toggle_holiday_mode":
      return [input.action === "start" ? "Holiday mode activated" : "Holiday mode ended"];
    default:
      return [];
  }
}

// ──────────────────────────────────────────────
// Main action
// ──────────────────────────────────────────────

export const sendMessage = action({
  args: {
    userId: v.id("users"),
    userMessage: v.string(),
    sessionId: v.string(),
  },
  handler: async (ctx, args): Promise<string> => {
    // 0. Rate limit check — prevent API abuse
    const rateCheck = await ctx.runQuery(api.chat.checkChatRateLimit, {
      userId: args.userId,
    });
    if (rateCheck.limited) {
      // Save user message + rate-limit response so it shows in history
      await ctx.runMutation(api.chat.saveMessage, {
        userId: args.userId,
        role: "user",
        content: args.userMessage,
        sessionId: args.sessionId,
      });
      const limitMsg = rateCheck.message ?? "Let's slow down a bit. Try again in a moment!";
      await ctx.runMutation(api.chat.saveMessage, {
        userId: args.userId,
        role: "assistant",
        content: limitMsg,
        sessionId: args.sessionId,
      });
      return limitMsg;
    }

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

    // Holiday mode status
    const holidayStatus = progress?.holidayMode?.active
      ? `HOLIDAY MODE ACTIVE since ${progress.holidayMode.startDate}${progress.holidayMode.endDate ? ` (auto-ends ${progress.holidayMode.endDate})` : ""} — streaks frozen, no HP damage`
      : null;

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
      ...(holidayStatus ? [`\n=== ${holidayStatus} ===`] : []),
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
    const conversationHistory: Array<{
      role: "user" | "assistant";
      content: string | any[];
    }> = (recentMessages ?? [])
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

    // 5. Call Claude API with tool-use loop
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
      let messages = [...conversationHistory];
      let finalReply = "";
      const executedToolCalls: Array<{ tool: string; items: string[] }> = [];

      // Tool-use loop: keep calling Claude until we get a text-only response
      for (let iteration = 0; iteration < 5; iteration++) {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.ANTHROPIC_API_KEY!,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-6-20250725",
            max_tokens: 1024,
            system: systemPrompt,
            messages,
            tools: TOOLS,
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

        // Check if there are tool_use blocks
        const toolUseBlocks = (data.content ?? []).filter(
          (block: any) => block.type === "tool_use"
        );

        if (toolUseBlocks.length === 0) {
          // No tool calls — extract text and we're done
          const textBlock = data.content?.find(
            (block: any) => block.type === "text"
          );
          finalReply =
            textBlock?.text ??
            "Hmm, I lost my train of thought. Could you say that again?";
          break;
        }

        // There are tool calls — execute them and continue the loop
        // First, add assistant's response (with tool_use blocks) to messages
        messages.push({
          role: "assistant" as const,
          content: data.content,
        });

        // Execute each tool call and build tool_result messages
        const toolResults: any[] = [];
        for (const toolBlock of toolUseBlocks) {
          console.log(
            `[DR. SAGE] Executing tool: ${toolBlock.name}`,
            JSON.stringify(toolBlock.input)
          );
          const result = await executeToolCall(
            ctx,
            args.userId,
            toolBlock.name,
            toolBlock.input
          );
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolBlock.id,
            content: result,
          });

          // Collect tool call info for UI badges
          const itemNames = extractItemNames(toolBlock.name, toolBlock.input);
          executedToolCalls.push({ tool: toolBlock.name, items: itemNames });
        }

        // Add tool results as a user message (Claude API convention)
        messages.push({
          role: "user" as const,
          content: toolResults,
        });

        // Also extract any text the assistant sent alongside tool calls
        const textAlongside = data.content?.find(
          (block: any) => block.type === "text"
        );
        if (textAlongside?.text) {
          // There might be text before/alongside tool calls — we'll let the
          // next iteration generate the full confirmation text
        }

        // If stop_reason is "end_turn" with tool blocks, we still loop
        // to get the final confirmation text from Claude
      }

      // If we fell through the loop without a reply (shouldn't happen)
      if (!finalReply) {
        finalReply =
          "I've processed your request! Check your habits, meds, or quests tabs to see the updates.";
      }

      // 6. Save assistant response (with tool call metadata if any)
      await ctx.runMutation(api.chat.saveMessage, {
        userId: args.userId,
        role: "assistant",
        content: finalReply,
        sessionId: args.sessionId,
        ...(executedToolCalls.length > 0 ? { toolCalls: executedToolCalls } : {}),
      });

      // 7. Trigger memory extraction check
      try {
        await ctx.runMutation(internal.chat.triggerChatMemoryExtraction, {
          userId: args.userId,
          sessionId: args.sessionId,
        });
      } catch (e) {
        console.warn("Failed to trigger chat memory extraction:", e);
      }

      return finalReply;
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
