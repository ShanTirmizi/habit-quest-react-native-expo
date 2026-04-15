import { internalMutation } from "./_generated/server";

/**
 * Memory Lifecycle Management
 *
 * Handles decay and pruning of AI memories to prevent bloat:
 * - Memories not referenced in 30+ days lose confidence
 * - Very low confidence memories older than 60 days are deleted
 * - Highly reinforced memories (>5 reinforcements) are protected
 */

export const decayMemories = internalMutation({
  handler: async (ctx) => {
    const memories = await ctx.db.query("aiMemories").collect();
    const now = new Date();
    const MS_PER_DAY = 1000 * 60 * 60 * 24;

    let decayedCount = 0;
    let deletedCount = 0;

    for (const memory of memories) {
      // Determine last reference time
      const lastRef = memory.lastReferencedAt
        ? new Date(memory.lastReferencedAt)
        : new Date(memory._creationTime);
      const daysSinceRef = Math.floor(
        (now.getTime() - lastRef.getTime()) / MS_PER_DAY
      );

      // Skip highly reinforced memories — user has clearly established this
      if (memory.reinforcementCount > 5) {
        continue;
      }

      // Only process memories not referenced in 30+ days
      if (daysSinceRef > 30) {
        // Calculate new confidence (decay by 0.1)
        const newConfidence = Math.max(0, memory.confidence - 0.1);

        // Delete if very low confidence and old (60+ days)
        if (newConfidence < 0.3 && daysSinceRef > 60) {
          await ctx.db.delete(memory._id);
          deletedCount++;
        } else {
          // Just decay the confidence
          await ctx.db.patch(memory._id, { confidence: newConfidence });
          decayedCount++;
        }
      }
    }

    if (process.env.NODE_ENV !== "production") {
      console.log(
        `Memory maintenance complete: ${decayedCount} decayed, ${deletedCount} deleted out of ${memories.length} total`
      );
    }

    return { decayedCount, deletedCount, totalProcessed: memories.length };
  },
});
