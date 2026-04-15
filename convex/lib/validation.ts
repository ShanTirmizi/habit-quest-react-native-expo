/**
 * Input validation helpers for Convex mutations.
 *
 * Convex validators (`v.string()`) ensure type correctness but don't enforce
 * length limits. These helpers prevent database bloat from unbounded user input.
 */

/** Maximum lengths for user-facing string fields */
export const MAX_LENGTHS = {
  /** Habit name, medicine name, goal title, quest title */
  name: 200,
  /** Short descriptions, improvement text, mood notes */
  shortText: 500,
  /** Journal content, thoughts, free-form text */
  longText: 5000,
  /** Chat messages */
  chatMessage: 10000,
  /** Gratitude entries */
  gratitude: 500,
  /** Achievement entries in journal */
  achievement: 300,
} as const;

/**
 * Truncate a string to a maximum length.
 * Returns the original string if within bounds, or a truncated version.
 */
export function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return value.slice(0, maxLength);
}

/**
 * Validate and truncate a string field. Returns truncated string.
 * For optional fields, pass undefined and it returns undefined.
 */
export function validateString(
  value: string | undefined,
  maxLength: number
): string | undefined {
  if (value === undefined) return undefined;
  return truncate(value.trim(), maxLength);
}

/**
 * Validate an array of strings, truncating each entry.
 */
export function validateStringArray(
  values: string[] | undefined,
  maxLength: number,
  maxItems = 50
): string[] | undefined {
  if (!values) return undefined;
  return values.slice(0, maxItems).map((v) => truncate(v.trim(), maxLength));
}
