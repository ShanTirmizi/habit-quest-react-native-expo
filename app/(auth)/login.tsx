import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
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
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/theme-context';
import { FontSize, Spacing, Radius, FontFamily, Shadows, type ThemeColors } from '@/constants/theme';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/auth-context';

const redirectTo = makeRedirectUri();

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation('auth');
  const styles = useMemo(() => createStyles(colors), [colors]);
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
      let message = t('error.generic');
      if (raw.includes('InvalidAccountId') || raw.includes('InvalidSecret')) {
        message = t('error.invalidCredentials');
      } else if (raw.includes('AccountAlreadyExists')) {
        message = t('error.accountExists');
      }
      Alert.alert(
        mode === 'login' ? t('error.signInFailed') : t('error.signUpFailed'),
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
          t('error.appleFailed'),
          err?.message || t('error.generic')
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
        t('error.googleFailed'),
        err?.message || t('error.generic')
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, Spacing.xl) }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
        >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={[colors.primaryBg, 'transparent']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <Ionicons name="shield-half" size={36} color={colors.primary} />
          </View>
          <Text style={styles.appName}>{t('appName')}</Text>
          <Text style={styles.tagline}>{t('tagline')}</Text>
        </View>

        {/* Auth Form */}
        <View style={styles.form}>
          {mode === 'signup' ? (
            <Input
              label={t('nameLabel')}
              value={name}
              onChangeText={setName}
              placeholder={t('namePlaceholder')}
              autoCapitalize="words"
            />
          ) : null}

          <Input
            label={t('emailLabel')}
            value={email}
            onChangeText={setEmail}
            placeholder={t('emailPlaceholder')}
            keyboardType="email-address"
            autoCapitalize="none"
            containerStyle={{ marginTop: mode === 'signup' ? Spacing.md : 0 }}
          />

          <Input
            label={t('passwordLabel')}
            value={password}
            onChangeText={setPassword}
            placeholder={t('passwordPlaceholder')}
            secureTextEntry
            containerStyle={{ marginTop: Spacing.md }}
          />

          {mode === 'signup' && (
            <Text style={styles.consentNote}>
              {t('consentNote')}{' '}
              <Text style={styles.consentLink} onPress={() => router.push('/privacy-policy')}>
                {t('privacyPolicy')}
              </Text>
              {' '}{t('and')}{' '}
              <Text style={styles.consentLink} onPress={() => router.push('/terms-of-service')}>
                {t('termsOfService')}
              </Text>
              .
            </Text>
          )}

          <View style={styles.mainButtonWrap}>
            <Button
              title={mode === 'login' ? t('signIn') : t('createAccount')}
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
            <Text style={styles.dividerText}>{t('or')}</Text>
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
                {appleLoading ? t('connecting') : t('continueWithApple')}
              </Text>
            </Pressable>
          ) : null}

          <Pressable
            style={({ pressed }) => [styles.oauthBtn, pressed && { opacity: 0.8 }]}
            onPress={handleGoogleSignIn}
            disabled={appleLoading || googleLoading}
          >
            <Ionicons name="logo-google" size={20} color={colors.foreground} />
            <Text style={styles.oauthText}>
              {googleLoading ? t('connecting') : t('continueWithGoogle')}
            </Text>
          </Pressable>

          {/* Toggle Mode */}
          <View style={styles.toggleRow}>
            <Text style={styles.toggleText}>
              {mode === 'login' ? t('noAccount') : t('hasAccount')}
            </Text>
            <Pressable onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}>
              <Text style={styles.toggleLink}>
                {mode === 'login' ? t('signUp') : t('signIn')}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Features Preview */}
        <View style={styles.features}>
          {([
            { icon: 'flame' as const, color: colors.accent, text: t('feature.habits') },
            { icon: 'shield' as const, color: colors.primary, text: t('feature.bosses') },
            { icon: 'compass' as const, color: colors.secondary, text: t('feature.insights') },
          ]).map((f, i) => (
            <View key={i} style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: f.color + '15' }]}>
                <Ionicons name={f.icon} size={16} color={f.color} />
              </View>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>
        </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing.xl,
  },
  hero: {
    alignItems: 'center',
    marginBottom: Spacing['3xl'],
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    overflow: 'hidden',
    ...Shadows.glow(colors.primary, 0.25),
  },
  appName: {
    fontSize: FontSize['4xl'],
    fontFamily: FontFamily.extrabold,
    color: colors.foreground,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.medium,
    color: colors.textSecondary,
    marginTop: Spacing.xs,
  },
  form: {},
  mainButtonWrap: {
    marginTop: Spacing.xl,
    ...Shadows.glow(colors.primary, 0.2),
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
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textMuted,
    fontSize: FontSize.sm,
    fontFamily: FontFamily.medium,
    marginHorizontal: Spacing.md,
  },
  oauthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.foreground,
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
    color: colors.textSecondary,
    fontFamily: FontFamily.regular,
  },
  toggleLink: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold,
    color: colors.primary,
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
    color: colors.textSecondary,
  },
  consentNote: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.regular,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.md,
    lineHeight: FontSize.xs * 1.5,
  },
  consentLink: {
    color: colors.primary,
    fontFamily: FontFamily.semibold,
  },
});
