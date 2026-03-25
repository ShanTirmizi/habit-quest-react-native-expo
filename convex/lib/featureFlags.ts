/**
 * Feature Flags — Central toggle for features under development.
 *
 * Server-side: import { FEATURE_FLAGS } from './lib/featureFlags'
 * Client-side: useQuery(api.featureFlags.getFlags)
 *
 * To toggle a flag: change the value here and deploy.
 */
export const FEATURE_FLAGS = {
  /** Neurodivergence support: onboarding step, personalisation screen,
   *  AI prompt enrichment, and gamification adaptations */
  neurodivergenceSupport: true,
} as const;

export type FeatureFlags = typeof FEATURE_FLAGS;
