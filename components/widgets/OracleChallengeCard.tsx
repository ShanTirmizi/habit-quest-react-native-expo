import React, { useCallback, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { FontSize, Spacing, Radius, FontFamily, Shadows, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/contexts/toast-context';

interface OracleChallengeCardProps {
  userId: Id<'users'>;
}

export function OracleChallengeCard({ userId }: OracleChallengeCardProps) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const { showToast } = useToast();
  const { t } = useTranslation('oracle');
  const challenge = useQuery(api.oracle.getChallenge, { userId });
  const generateMutation = useMutation(api.oracle.generateChallenge);
  const acceptMutation = useMutation(api.oracle.acceptChallenge);
  const completeMutation = useMutation(api.oracle.completeChallenge);
  const dismissMutation = useMutation(api.oracle.dismissChallenge);

  const [actionLoading, setActionLoading] = useState(false);

  const handleGenerate = useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await generateMutation({ userId });
      showToast(t('toast.speaks'), undefined, 'xp');
    } catch {
      showToast(t('toast.silent'), undefined, 'error');
    }
  }, [userId, generateMutation, showToast]);

  const handleAccept = useCallback(async () => {
    if (!challenge || actionLoading) return;
    setActionLoading(true);
    try {
      await acceptMutation({ userId, challengeId: challenge._id });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(t('toast.accepted'), undefined, 'xp');
    } catch (err) {
      showToast(t('toast.acceptError'), undefined, 'error');
    } finally {
      setActionLoading(false);
    }
  }, [userId, challenge, actionLoading, acceptMutation, showToast]);

  const handleComplete = useCallback(async () => {
    if (!challenge || actionLoading) return;
    setActionLoading(true);
    try {
      const result = await completeMutation({ userId, challengeId: challenge._id });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(t('toast.completed'), result.xpReward, 'xp');
    } catch {
      showToast(t('toast.completeError'), undefined, 'error');
    } finally {
      setActionLoading(false);
    }
  }, [userId, challenge, actionLoading, completeMutation, showToast]);

  const handleDismiss = useCallback(async () => {
    if (!challenge || actionLoading) return;
    setActionLoading(true);
    try {
      await dismissMutation({ userId, challengeId: challenge._id });
      showToast(t('toast.dismissed'), undefined, 'hp');
    } catch {
      showToast(t('toast.dismissError'), undefined, 'error');
    } finally {
      setActionLoading(false);
    }
  }, [userId, challenge, actionLoading, dismissMutation, showToast]);

  // No active challenge
  if (challenge === null) {
    return (
      <View style={styles.wrapper}>
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Ionicons name="eye-outline" size={20} color={isDark ? colors.categoryMind : '#fff'} />
            <Text style={styles.title}>{t('title')}</Text>
          </View>
          <Text style={styles.description}>{t('description')}</Text>
          <Button title={t('button.consult')} onPress={handleGenerate} size="sm" />
        </View>
      </View>
    );
  }

  if (challenge === undefined) return null;

  const isAccepted = challenge.accepted && !challenge.completed;
  const isPending = !challenge.accepted && !challenge.completed;

  return (
    <View style={styles.wrapper}>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Ionicons name="eye" size={20} color={isDark ? colors.categoryMind : '#fff'} />
          <Text style={styles.title}>Oracle Challenge</Text>
          <Text style={styles.xpBadge}>{t('xpBadge', { xp: challenge.xpReward })}</Text>
        </View>
        <Text style={styles.challengeText}>{challenge.challengeText}</Text>
        <View style={styles.actions}>
          {isPending ? (
            <>
              <Button title={t('button.accept')} onPress={handleAccept} size="sm" loading={actionLoading} disabled={actionLoading} />
              <Button title={t('button.dismiss')} onPress={handleDismiss} size="sm" variant="ghost" disabled={actionLoading} textColor={isDark ? undefined : 'rgba(255,255,255,0.85)'} />
            </>
          ) : isAccepted ? (
            <Button title={t('button.complete')} onPress={handleComplete} size="sm" loading={actionLoading} disabled={actionLoading} />
          ) : challenge.completed ? (
            <View style={styles.completedBadge}>
              <Ionicons name="checkmark-circle" size={18} color={isDark ? colors.success : '#FFFFFF'} />
              <Text style={styles.completedText}>{t('status.completed')}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  wrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: isDark ? colors.surface : colors.categoryMindCard,
    ...(isDark ? {} : Shadows.card),
    borderWidth: isDark ? 1 : 0,
    borderColor: colors.borderStrong,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold,
    color: isDark ? colors.categoryMind : '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  xpBadge: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.extrabold,
    color: isDark ? colors.primary : '#FFFFFF',
  },
  description: {
    fontSize: FontSize.sm,
    color: isDark ? colors.textSecondary : 'rgba(255, 255, 255, 0.85)',
    lineHeight: 18,
  },
  challengeText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.medium,
    color: isDark ? colors.foreground : '#FFFFFF',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  completedText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold,
    color: '#FFFFFF',
  },
});
