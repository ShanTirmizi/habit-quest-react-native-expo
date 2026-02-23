import { convexAuth } from '@convex-dev/auth/server';
import { Password } from '@convex-dev/auth/providers/Password';
import GitHub from '@auth/core/providers/github';
import Google from '@auth/core/providers/google';

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    // Email/Password authentication
    Password,
    // OAuth providers (for web and mobile)
    GitHub,
    Google,
  ],
  callbacks: {
    // Allow mobile deep link redirects (exp://, habitquest://)
    async redirect({ redirectTo }) {
      return redirectTo;
    },
  },
});
