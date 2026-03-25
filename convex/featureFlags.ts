import { query } from './_generated/server';
import { FEATURE_FLAGS } from './lib/featureFlags';

/** Expose feature flags to the frontend via useQuery(api.featureFlags.getFlags) */
export const getFlags = query({
  args: {},
  handler: async () => {
    return FEATURE_FLAGS;
  },
});
