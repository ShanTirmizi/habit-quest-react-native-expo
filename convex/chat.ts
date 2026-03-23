import { v } from 'convex/values';
import { mutation, query, internalMutation, MutationCtx, QueryCtx } from './_generated/server';
import { Id } from './_generated/dataModel';
import { getAuthUserId } from '@convex-dev/auth/server';
import { internal } from './_generated/api';

// Helper to verify authenticated user matches requested user
async function verifyAuth(ctx: MutationCtx | QueryCtx, requestedUserId: string) {
  const authUserId = await getAuthUserId(ctx);
  if (!authUserId) {
    throw new Error('Unauthorized: Not authenticated');
  }
  if (authUserId !== requestedUserId) {
    throw new Error("Unauthorized: Cannot access other user's data");
  }
  return authUserId;
}

// ============================================
// RATE LIMITING
// ============================================

const CHAT_RATE_LIMITS = {
  PER_MINUTE: 5,   // Max 5 messages per minute
  PER_HOUR: 30,    // Max 30 messages per hour
  COOLDOWN_MS: 3000, // Min 3 seconds between messages
};

// Query to check if user is rate-limited (called from chatAction)
export const checkChatRateLimit = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const now = Date.now();
    const oneMinuteAgo = now - 60_000;
    const oneHourAgo = now - 3_600_000;

    // Get recent user messages (last hour, user role only)
    const recentMessages = await ctx.db
      .query('chatMessages')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .order('desc')
      .take(CHAT_RATE_LIMITS.PER_HOUR + 1);

    const userMessages = recentMessages.filter((m) => m.role === 'user');

    // Check cooldown — time since last message
    if (userMessages.length > 0) {
      const lastMsg = userMessages[0];
      if (now - lastMsg._creationTime < CHAT_RATE_LIMITS.COOLDOWN_MS) {
        return {
          limited: true,
          reason: 'cooldown',
          message: "I'm still thinking about your last message! Give me a moment.",
          retryAfterMs: CHAT_RATE_LIMITS.COOLDOWN_MS - (now - lastMsg._creationTime),
        };
      }
    }

    // Check per-minute limit
    const lastMinuteCount = userMessages.filter(
      (m) => m._creationTime >= oneMinuteAgo
    ).length;
    if (lastMinuteCount >= CHAT_RATE_LIMITS.PER_MINUTE) {
      return {
        limited: true,
        reason: 'per_minute',
        message: "You're chatting really fast! Let's slow down a bit — quality over quantity. Try again in a minute.",
        retryAfterMs: 60_000,
      };
    }

    // Check per-hour limit
    const lastHourCount = userMessages.filter(
      (m) => m._creationTime >= oneHourAgo
    ).length;
    if (lastHourCount >= CHAT_RATE_LIMITS.PER_HOUR) {
      return {
        limited: true,
        reason: 'per_hour',
        message: "We've had a great conversation! I need a short break to recharge. Let's pick this up in a bit.",
        retryAfterMs: 3_600_000,
      };
    }

    return { limited: false, reason: null, message: null, retryAfterMs: 0 };
  },
});

// ============================================
// CHAT MESSAGES
// ============================================

// Get recent chat messages for a user
export const getRecentMessages = query({
  args: {
    userId: v.id('users'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    const messages = await ctx.db
      .query('chatMessages')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .order('desc')
      .take(limit);

    // Return in chronological order
    return messages.reverse();
  },
});

// Get messages from a specific session
export const getSessionMessages = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query('chatMessages')
      .withIndex('by_session', (q) => q.eq('sessionId', args.sessionId))
      .order('asc')
      .collect();

    return messages;
  },
});

// Save a chat message
export const saveMessage = mutation({
  args: {
    userId: v.id('users'),
    role: v.union(v.literal('user'), v.literal('assistant')),
    content: v.string(),
    sessionId: v.string(),
    toolCalls: v.optional(v.array(v.object({
      tool: v.string(),
      items: v.array(v.string()),
    }))),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    return await ctx.db.insert('chatMessages', {
      userId: args.userId,
      role: args.role,
      content: args.content,
      sessionId: args.sessionId,
      ...(args.toolCalls ? { toolCalls: args.toolCalls } : {}),
    });
  },
});

// Save multiple messages at once (for batch saving)
export const saveMessages = mutation({
  args: {
    userId: v.id('users'),
    messages: v.array(
      v.object({
        role: v.union(v.literal('user'), v.literal('assistant')),
        content: v.string(),
      })
    ),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const ids: Id<'chatMessages'>[] = [];

    for (const msg of args.messages) {
      const id = await ctx.db.insert('chatMessages', {
        userId: args.userId,
        role: msg.role,
        content: msg.content,
        sessionId: args.sessionId,
      });
      ids.push(id);
    }

    return ids;
  },
});

// ============================================
// AI MEMORIES
// ============================================

// Get all memories for a user
export const getMemories = query({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('aiMemories')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();
  },
});

// Get memories by category
export const getMemoriesByCategory = query({
  args: {
    userId: v.id('users'),
    category: v.union(
      v.literal('preference'),
      v.literal('goal'),
      v.literal('blocker'),
      v.literal('motivation'),
      v.literal('context'),
      v.literal('strategy'),
      v.literal('insight')
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('aiMemories')
      .withIndex('by_category', (q) => q.eq('userId', args.userId).eq('category', args.category))
      .collect();
  },
});

// Save a new memory
export const saveMemory = mutation({
  args: {
    userId: v.id('users'),
    category: v.union(
      v.literal('preference'),
      v.literal('goal'),
      v.literal('blocker'),
      v.literal('motivation'),
      v.literal('context'),
      v.literal('strategy'),
      v.literal('insight')
    ),
    content: v.string(),
    source: v.union(v.literal('chat'), v.literal('journal'), v.literal('habit_pattern')),
    confidence: v.number(),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    // Check if a similar memory already exists
    const existingMemories = await ctx.db
      .query('aiMemories')
      .withIndex('by_category', (q) => q.eq('userId', args.userId).eq('category', args.category))
      .collect();

    // Simple similarity check - if content is very similar, reinforce instead
    const similarMemory = existingMemories.find(
      (m) =>
        m.content.toLowerCase().includes(args.content.toLowerCase().slice(0, 50)) ||
        args.content.toLowerCase().includes(m.content.toLowerCase().slice(0, 50))
    );

    if (similarMemory) {
      // Reinforce existing memory
      await ctx.db.patch(similarMemory._id, {
        reinforcementCount: similarMemory.reinforcementCount + 1,
        confidence: Math.min(1, similarMemory.confidence + 0.1),
        lastReferencedAt: new Date().toISOString(),
      });
      return similarMemory._id;
    }

    // Create new memory
    return await ctx.db.insert('aiMemories', {
      userId: args.userId,
      category: args.category,
      content: args.content,
      source: args.source,
      confidence: args.confidence,
      reinforcementCount: 1,
      lastReferencedAt: new Date().toISOString(),
    });
  },
});

// Save multiple memories at once
export const saveMemories = mutation({
  args: {
    userId: v.id('users'),
    memories: v.array(
      v.object({
        category: v.union(
          v.literal('preference'),
          v.literal('goal'),
          v.literal('blocker'),
          v.literal('motivation'),
          v.literal('context'),
          v.literal('strategy'),
          v.literal('insight')
        ),
        content: v.string(),
        source: v.union(v.literal('chat'), v.literal('journal'), v.literal('habit_pattern')),
        confidence: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    // Query all existing memories once upfront to avoid N+1 queries
    const allExistingMemories = await ctx.db
      .query('aiMemories')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    // Group existing memories by category for O(1) lookup
    const memoriesByCategory = new Map<string, typeof allExistingMemories>();
    for (const m of allExistingMemories) {
      const categoryMemories = memoriesByCategory.get(m.category) || [];
      categoryMemories.push(m);
      memoriesByCategory.set(m.category, categoryMemories);
    }

    const ids: Id<'aiMemories'>[] = [];

    for (const memory of args.memories) {
      // Look up existing memories from our pre-fetched map
      const existingMemories = memoriesByCategory.get(memory.category) || [];

      const similarMemory = existingMemories.find(
        (m) =>
          m.content.toLowerCase().includes(memory.content.toLowerCase().slice(0, 50)) ||
          memory.content.toLowerCase().includes(m.content.toLowerCase().slice(0, 50))
      );

      if (similarMemory) {
        await ctx.db.patch(similarMemory._id, {
          reinforcementCount: similarMemory.reinforcementCount + 1,
          confidence: Math.min(1, similarMemory.confidence + 0.1),
          lastReferencedAt: new Date().toISOString(),
        });
        ids.push(similarMemory._id);
      } else {
        const id = await ctx.db.insert('aiMemories', {
          userId: args.userId,
          category: memory.category,
          content: memory.content,
          source: memory.source,
          confidence: memory.confidence,
          reinforcementCount: 1,
          lastReferencedAt: new Date().toISOString(),
        });
        ids.push(id);
      }
    }

    return ids;
  },
});

// Update memory reference time (when AI uses a memory)
export const touchMemory = mutation({
  args: {
    memoryId: v.id('aiMemories'),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const memory = await ctx.db.get(args.memoryId);
    if (!memory || memory.userId !== args.userId) return;

    await ctx.db.patch(args.memoryId, {
      lastReferencedAt: new Date().toISOString(),
    });
  },
});

// Delete a memory
export const deleteMemory = mutation({
  args: {
    memoryId: v.id('aiMemories'),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    await verifyAuth(ctx, args.userId);

    const memory = await ctx.db.get(args.memoryId);
    if (!memory || memory.userId !== args.userId) return false;

    await ctx.db.delete(args.memoryId);
    return true;
  },
});

// Get chat history summary for context
export const getChatSummary = query({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    // Get all messages to avoid a second query just for counting
    // We need all messages anyway for the count, and we take the last 20 from there
    const allMessages = await ctx.db
      .query('chatMessages')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .order('desc')
      .collect();

    // Take the 20 most recent (already in desc order)
    const recentMessages = allMessages.slice(0, 20).reverse();

    // Get all memories
    const memories = await ctx.db
      .query('aiMemories')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    return {
      totalMessages: allMessages.length,
      recentMessages,
      memories: memories.sort((a, b) => b.confidence - a.confidence),
      memoriesByCategory: {
        preferences: memories.filter((m) => m.category === 'preference'),
        goals: memories.filter((m) => m.category === 'goal'),
        blockers: memories.filter((m) => m.category === 'blocker'),
        motivations: memories.filter((m) => m.category === 'motivation'),
        context: memories.filter((m) => m.category === 'context'),
        strategies: memories.filter((m) => m.category === 'strategy'),
        insights: memories.filter((m) => m.category === 'insight'),
      },
    };
  },
});

// ============================================
// CHAT MEMORY EXTRACTION TRIGGER
// ============================================

// Internal mutation to check session message count and schedule memory extraction
// Called from chatAction after saving assistant response (actions cannot use ctx.scheduler)
export const triggerChatMemoryExtraction = internalMutation({
  args: {
    userId: v.id('users'),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user has opted out of AI processing
    const user = await ctx.db.get(args.userId);
    if (user?.aiProcessingEnabled === false) return;

    const CHAT_EXTRACTION_THRESHOLD = 5; // Every 5th message pair in a session

    // Count messages in this session
    const sessionMessages = await ctx.db
      .query('chatMessages')
      .withIndex('by_session', (q) => q.eq('sessionId', args.sessionId))
      .collect();

    // Only trigger on every 5th user message (count user messages only)
    const userMessageCount = sessionMessages.filter((m) => m.role === 'user').length;

    if (userMessageCount > 0 && userMessageCount % CHAT_EXTRACTION_THRESHOLD === 0) {
      // Get the last few messages for extraction (both user and assistant)
      const recentMessages = sessionMessages
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      await ctx.scheduler.runAfter(
        0,
        internal.memoryExtraction.extractMemoriesFromChat,
        {
          userId: args.userId,
          messages: recentMessages,
        }
      );
    }
  },
});
