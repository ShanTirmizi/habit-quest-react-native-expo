/**
 * Locale helpers for Convex AI actions.
 *
 * Pure string manipulation — does NOT import i18next (which is frontend-only).
 * Used by chatAction.ts, coaching.ts, goalAI.ts, and memoryExtraction.ts
 * to make Claude respond in the user's preferred language.
 */

/**
 * Build a language directive to prepend to AI system prompts.
 * Returns empty string for English (the default), a strong directive for other languages.
 */
export function buildLanguageDirective(locale: string): string {
  if (locale === 'zh') {
    return `CRITICAL LANGUAGE REQUIREMENT: You MUST respond ONLY in Simplified Chinese (简体中文). ALL text — advice, habit names, suggestions, insight titles, feedback, coaching, questions, and tool call arguments (habit names, medicine names, quest titles) — MUST be in Chinese. Do NOT use English anywhere in your response.\n\n`;
  }

  // English is the default — no directive needed
  return '';
}
