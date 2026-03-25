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
import { useTranslation } from 'react-i18next';
import { api } from '@/convex/_generated/api';
import { useTheme } from '@/contexts/theme-context';
import { FontSize, Spacing, Radius, FontFamily, Shadows, type ThemeColors } from '@/constants/theme';
import { Button } from '@/components/ui/Button';

export default function ConsentScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation('auth');
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
          <Text style={styles.title}>{t('consent.title')}</Text>
          <Text style={styles.subtitle}>
            {t('consent.subtitle')}
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
              {t('consent.privacyLabel')}{' '}
              <Text
                style={styles.link}
                onPress={() => router.push('/privacy-policy')}
              >
                {t('privacyPolicy')}
              </Text>
              {' '}{t('consent.privacyAnd')}{' '}
              <Text
                style={styles.link}
                onPress={() => router.push('/terms-of-service')}
              >
                {t('termsOfService')}
              </Text>
            </Text>
            <Text style={styles.required}>{t('consent.required')}</Text>
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
              {t('consent.healthLabel')}
            </Text>
            <Text style={styles.consentSub}>
              {t('consent.healthSub')}
            </Text>
            <Text style={styles.required}>{t('consent.required')}</Text>
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
              {t('consent.aiLabel')}
            </Text>
            <Text style={styles.consentSub}>
              {t('consent.aiSub')}
            </Text>
            <Text style={styles.optional}>{t('consent.optional')}</Text>
          </View>
        </Pressable>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.infoText}>
            {t('consent.infoText')}
          </Text>
        </View>

        <View style={styles.buttonWrap}>
          <Button
            title={loading ? t('consent.saving') : t('consent.continue')}
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
