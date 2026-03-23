import { MutationCtx, QueryCtx } from '../_generated/server';
import { getAuthUserId } from '@convex-dev/auth/server';

/**
 * Verify the authenticated user matches the requested userId.
 * Use in mutations AND queries that access user-specific data.
 */
export async function verifyAuth(ctx: MutationCtx | QueryCtx, requestedUserId: string) {
  const authUserId = await getAuthUserId(ctx);
  if (!authUserId) {
    throw new Error('Unauthorized: Not authenticated');
  }
  if (authUserId !== requestedUserId) {
    throw new Error("Unauthorized: Cannot access other user's data");
  }
  return authUserId;
}

/**
 * Get the authenticated user's ID or throw.
 * Use in mutations/queries that derive userId from the session (no userId arg).
 */
export async function requireAuth(ctx: MutationCtx | QueryCtx) {
  const authUserId = await getAuthUserId(ctx);
  if (!authUserId) {
    throw new Error('Unauthorized: Not authenticated');
  }
  return authUserId;
}
