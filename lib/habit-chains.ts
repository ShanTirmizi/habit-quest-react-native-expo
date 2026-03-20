import type { Habit } from '@/types';

/**
 * Builds a reverse lookup map: given all habits, maps each habit ID
 * to the array of habits that are chained *after* it.
 *
 * e.g. if habit B has chainedToHabitId = A, then A -> [B]
 */
export function buildChainFollowersMap(habits: Habit[]): Map<string, Habit[]> {
  const map = new Map<string, Habit[]>();

  for (const habit of habits) {
    // Skip hibernated habits — they shouldn't appear in chain previews
    if (habit.hibernatedAt) continue;

    if (habit.chainedToHabitId) {
      const existing = map.get(habit.chainedToHabitId);
      if (existing) {
        existing.push(habit);
      } else {
        map.set(habit.chainedToHabitId, [habit]);
      }
    }
  }

  return map;
}

/**
 * Starting from a habit, recursively collects the full ordered chain
 * of downstream habits. Returns a flat array in execution order.
 *
 * Tracks visited IDs to prevent infinite loops from circular chains.
 * Caps depth to avoid runaway recursion.
 */
export function resolveFullChain(
  habitId: string,
  followersMap: Map<string, Habit[]>,
  maxDepth = 5,
): Habit[] {
  const result: Habit[] = [];
  const visited = new Set<string>();

  function walk(id: string, depth: number) {
    if (depth >= maxDepth) return;
    const followers = followersMap.get(id);
    if (!followers) return;

    for (const habit of followers) {
      if (visited.has(habit.id)) continue;
      visited.add(habit.id);
      result.push(habit);
      walk(habit.id, depth + 1);
    }
  }

  visited.add(habitId);
  walk(habitId, 0);
  return result;
}
