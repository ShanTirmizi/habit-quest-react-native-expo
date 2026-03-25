import React, { createContext, useContext, useMemo } from 'react';
import { useConvexAuth, useQuery } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

interface User {
  _id: Id<'users'>;
  email?: string;
  name?: string;
  image?: string;
  avatarUrl?: string;
  hasCompletedOnboarding?: boolean;
  privacyPolicyAccepted?: boolean;
  aiProcessingEnabled?: boolean;
  locale?: string;
}

interface AuthContextValue {
  user: User | null;
  userId: Id<'users'> | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: ReturnType<typeof useAuthActions>['signIn'];
  signOut: ReturnType<typeof useAuthActions>['signOut'];
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signIn, signOut } = useAuthActions();

  // Only query current user when authenticated
  const currentUser = useQuery(
    api.users.currentUser,
    isAuthenticated ? {} : 'skip'
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user: currentUser ?? null,
      userId: currentUser?._id ?? null,
      isLoading,
      isAuthenticated,
      signIn,
      signOut,
    }),
    [currentUser, isLoading, isAuthenticated, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
