import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useTheme } from '@/contexts/theme-context';
import { FontSize, Spacing, Radius, FontFamily, Shadows, type ThemeColors } from '@/constants/theme';
import { Button } from '@/components/ui/Button';

export default function ConsentScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const acceptConsent = useMutation(api.users.acceptConsent);

  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [healthConsent, setHealthConsent] = useState(false);
  const [aiConsent, setAiConsent] = useState(true);
  const [loading, setLoading] = useState(false);

  const canContinue = privacyAccepted && healthConsent;

  const handleContinue = async () => {
    if (!canContinue) return;
    setLoading(true);
    try {
      await acceptConsent({
        healthDataConsent: healthConsent,
        aiProcessingEnabled: aiConsent,
      });
      router.replace('/onboarding');
    } catch {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <Ionicons name="shield-checkmark" size={40} color={colors.primary} />
          </View>
          <Text style={styles.title}>Your Privacy Matters</Text>
          <Text style={styles.subtitle}>
            Before you start, please review how we handle your data.
          </Text>
        </View>

        {/* Privacy Policy + Terms */}
        <Pressable
          style={styles.consentRow}
          onPress={() => setPrivacyAccepted(!privacyAccepted)}
        >
          <View style={[styles.checkbox, privacyAccepted && styles.checkboxChecked]}>
            {privacyAccepted && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
          </View>
          <View style={styles.consentTextWrap}>
            <Text style={styles.consentLabel}>
              I agree to the{' '}
              <Text
                style={styles.link}
                onPress={() => router.push('/privacy-policy')}
              >
                Privacy Policy
              </Text>
              {' '}and{' '}
              <Text
                style={styles.link}
                onPress={() => router.push('/terms-of-service')}
              >
                Terms of Service
              </Text>
            </Text>
            <Text style={styles.required}>Required</Text>
          </View>
        </Pressable>

        {/* Health Data Consent */}
        <Pressable
          style={styles.consentRow}
          onPress={() => setHealthConsent(!healthConsent)}
        >
          <View style={[styles.checkbox, healthConsent && styles.checkboxChecked]}>
            {healthConsent && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
          </View>
          <View style={styles.consentTextWrap}>
            <Text style={styles.consentLabel}>
              I consent to the processing of health-related data (medicine tracking, health habits)
            </Text>
            <Text style={styles.consentSub}>
              Required to use medicine tracking features. Your health data is encrypted and never sold.
            </Text>
            <Text style={styles.required}>Required</Text>
          </View>
        </Pressable>

        {/* AI Processing */}
        <Pressable
          style={styles.consentRow}
          onPress={() => setAiConsent(!aiConsent)}
        >
          <View style={[styles.checkbox, aiConsent && styles.checkboxChecked]}>
            {aiConsent && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
          </View>
          <View style={styles.consentTextWrap}>
            <Text style={styles.consentLabel}>
              Enable AI-powered features (coaching, journal analysis, memory extraction)
            </Text>
            <Text style={styles.consentSub}>
              Your data is sent to Anthropic for AI processing but is never used to train AI models. You can change this later in Settings.
            </Text>
            <Text style={styles.optional}>Optional</Text>
          </View>
        </Pressable>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.infoText}>
            You can export or delete all your data at any time from Settings. We process data under GDPR Article 6(1)(a) — your explicit consent.
          </Text>
        </View>

        <View style={styles.buttonWrap}>
          <Button
            title={loading ? 'Saving...' : 'Continue'}
            onPress={handleContinue}
            disabled={!canContinue || loading}
            fullWidth
            size="lg"
          />
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
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing['2xl'],
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontFamily: FontFamily.extrabold,
    fontSize: FontSize['2xl'],
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: FontSize.sm * 1.5,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    backgroundColor: colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  consentTextWrap: {
    flex: 1,
    gap: 4,
  },
  consentLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: colors.foreground,
    lineHeight: FontSize.sm * 1.5,
  },
  consentSub: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: colors.textSecondary,
    lineHeight: FontSize.xs * 1.5,
  },
  link: {
    color: colors.primary,
    fontFamily: FontFamily.semibold,
  },
  required: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.xs,
    color: colors.accent,
  },
  optional: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.xs,
    color: colors.textMuted,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: colors.surfaceLight,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  infoText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: colors.textSecondary,
    lineHeight: FontSize.xs * 1.5,
  },
  buttonWrap: {
    marginTop: Spacing.xl,
    ...Shadows.glow(colors.primary, 0.2),
    borderRadius: Radius.md,
  },
});
