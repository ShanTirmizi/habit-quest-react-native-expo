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
import { LinearGradient } from 'expo-linear-gradient';
import { makeRedirectUri } from 'expo-auth-session';
import { openAuthSessionAsync } from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Colors, FontSize, Spacing, Radius, FontFamily, Shadows } from '@/constants/theme';
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
  const [appleLoading, setAppleLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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

  const handleAppleSignIn = async () => {
    setAppleLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (credential.identityToken) {
        const { redirect } = await signIn('apple', { redirectTo });
        if (redirect) {
          const result = await openAuthSessionAsync(
            redirect.toString(),
            redirectTo
          );
          if (result.type === 'success') {
            const { url } = result;
            const code = new URL(url).searchParams.get('code');
            if (code) {
              await signIn('apple', { code });
            }
          }
        }
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      if (err.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert(
          'Apple Sign In Failed',
          err?.message || 'Something went wrong. Please try again.'
        );
      }
    } finally {
      setAppleLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { redirect } = await signIn('google', { redirectTo });
      if (Platform.OS === 'web') {
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
      setGoogleLoading(false);
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
            <LinearGradient
              colors={[Colors.primaryBg, 'transparent']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <Ionicons name="shield-half" size={36} color={Colors.primary} />
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

          <View style={styles.mainButtonWrap}>
            <Button
              title={mode === 'login' ? 'Sign In' : 'Create Account'}
              onPress={handleEmailAuth}
              loading={loading}
              disabled={!email || !password}
              fullWidth
              size="lg"
            />
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* OAuth Buttons */}
          {Platform.OS === 'ios' ? (
            <Pressable
              style={({ pressed }) => [styles.oauthBtn, styles.appleBtn, pressed && { opacity: 0.8 }]}
              onPress={handleAppleSignIn}
              disabled={appleLoading || googleLoading}
            >
              <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
              <Text style={[styles.oauthText, { color: '#FFFFFF' }]}>
                {appleLoading ? 'Connecting...' : 'Continue with Apple'}
              </Text>
            </Pressable>
          ) : null}

          <Pressable
            style={({ pressed }) => [styles.oauthBtn, pressed && { opacity: 0.8 }]}
            onPress={handleGoogleSignIn}
            disabled={appleLoading || googleLoading}
          >
            <Ionicons name="logo-google" size={20} color={Colors.foreground} />
            <Text style={styles.oauthText}>
              {googleLoading ? 'Connecting...' : 'Continue with Google'}
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
            { icon: 'compass' as const, color: Colors.secondary, text: 'AI-powered insights' },
          ]).map((f, i) => (
            <View key={i} style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: f.color + '15' }]}>
                <Ionicons name={f.icon} size={16} color={f.color} />
              </View>
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
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    overflow: 'hidden',
    ...Shadows.glow(Colors.primary, 0.25),
  },
  appName: {
    fontSize: FontSize['4xl'],
    fontFamily: FontFamily.extrabold,
    color: Colors.foreground,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.medium,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  form: {},
  mainButtonWrap: {
    marginTop: Spacing.xl,
    ...Shadows.glow(Colors.primary, 0.2),
    borderRadius: Radius.md,
  },
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
    fontFamily: FontFamily.medium,
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
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
  },
  appleBtn: {
    backgroundColor: '#000000',
    borderColor: '#333333',
    marginBottom: Spacing.sm,
  },
  oauthText: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.semibold,
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
    fontFamily: FontFamily.regular,
  },
  toggleLink: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold,
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
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.medium,
    color: Colors.textSecondary,
  },
});
