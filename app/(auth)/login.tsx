import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { makeRedirectUri } from 'expo-auth-session';
import { openAuthSessionAsync } from 'expo-web-browser';
import { Colors, FontSize, Spacing, Radius } from '@/constants/theme';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/auth-context';

const redirectTo = makeRedirectUri();

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  const handleEmailAuth = async () => {
    if (!email || !password) return;
    setLoading(true);
    try {
      if (mode === 'signup') {
        await signIn('password', { email, password, name, flow: 'signUp' });
      } else {
        await signIn('password', { email, password, flow: 'signIn' });
      }
      router.replace('/(tabs)');
    } catch (err: any) {
      const raw = err?.message || '';
      let message = 'Something went wrong. Please try again.';
      if (raw.includes('InvalidAccountId') || raw.includes('InvalidSecret')) {
        message = 'Incorrect email or password. Please try again.';
      } else if (raw.includes('AccountAlreadyExists')) {
        message = 'An account with this email already exists. Try signing in instead.';
      }
      Alert.alert(
        mode === 'login' ? 'Sign In Failed' : 'Sign Up Failed',
        message
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setOauthLoading(true);
    try {
      const { redirect } = await signIn('google', { redirectTo });
      if (Platform.OS === 'web') {
        // Web handles redirect automatically
        return;
      }
      if (redirect) {
        const result = await openAuthSessionAsync(
          redirect.toString(),
          redirectTo
        );
        if (result.type === 'success') {
          const { url } = result;
          const code = new URL(url).searchParams.get('code');
          if (code) {
            await signIn('google', { code });
          }
        }
      }
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert(
        'Google Sign In Failed',
        err?.message || 'Something went wrong. Please try again.'
      );
    } finally {
      setOauthLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 40 }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.logoContainer}>
            <Ionicons name="shield-half" size={32} color={Colors.primary} />
          </View>
          <Text style={styles.appName}>HabitQuest</Text>
          <Text style={styles.tagline}>Level up your life, one habit at a time</Text>
        </View>

        {/* Auth Form */}
        <View style={styles.form}>
          {mode === 'signup' ? (
            <Input
              label="Name"
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              autoCapitalize="words"
            />
          ) : null}

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            containerStyle={{ marginTop: mode === 'signup' ? Spacing.md : 0 }}
          />

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            containerStyle={{ marginTop: Spacing.md }}
          />

          <Button
            title={mode === 'login' ? 'Sign In' : 'Create Account'}
            onPress={handleEmailAuth}
            loading={loading}
            disabled={!email || !password}
            fullWidth
            size="lg"
            style={{ marginTop: Spacing.xl }}
          />

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* OAuth Buttons */}
          <Pressable
            style={({ pressed }) => [styles.oauthBtn, pressed && { opacity: 0.8 }]}
            onPress={handleGoogleSignIn}
            disabled={oauthLoading}
          >
            <Ionicons name="logo-google" size={20} color={Colors.foreground} />
            <Text style={styles.oauthText}>
              {oauthLoading ? 'Connecting...' : 'Continue with Google'}
            </Text>
          </Pressable>

          {/* Toggle Mode */}
          <View style={styles.toggleRow}>
            <Text style={styles.toggleText}>
              {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
            </Text>
            <Pressable onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}>
              <Text style={styles.toggleLink}>
                {mode === 'login' ? 'Sign Up' : 'Sign In'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Features Preview */}
        <View style={styles.features}>
          {([
            { icon: 'flame' as const, color: Colors.accent, text: 'Track habits & build streaks' },
            { icon: 'shield' as const, color: Colors.primary, text: 'Defeat weekly bosses' },
            { icon: 'analytics' as const, color: Colors.info, text: 'AI-powered insights' },
          ]).map((f, i) => (
            <View key={i} style={styles.featureItem}>
              <Ionicons name={f.icon} size={18} color={f.color} />
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing['2xl'],
    justifyContent: 'center',
  },
  hero: {
    alignItems: 'center',
    marginBottom: Spacing['3xl'],
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryBg,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  appName: {
    fontSize: FontSize['3xl'],
    fontWeight: '900',
    color: Colors.foreground,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  form: {},
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    marginHorizontal: Spacing.md,
  },
  oauthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
  },
  oauthText: {
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.foreground,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xl,
  },
  toggleText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  toggleLink: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primary,
  },
  features: {
    marginTop: Spacing['4xl'],
    gap: Spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  featureText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
});
