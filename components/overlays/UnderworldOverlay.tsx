import React, { useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useQuery, useMutation } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { FontSize, Spacing, Radius, FontFamily, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/contexts/toast-context';

interface UnderworldOverlayProps {
  userId: Id<'users'>;
}

export function UnderworldOverlay({ userId }: UnderworldOverlayProps) {
  const { colors } = useTheme();
  const { t } = useTranslation('underworld');
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { showToast } = useToast();
  const status = useQuery(api.progress.getUnderworldStatus, { userId });
  const resurrectMutation = useMutation(api.progress.resurrect);

  const pulseOpacity = useSharedValue(0.3);

  useEffect(() => {
    if (status?.inUnderworld) {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 1200 }),
          withTiming(0.3, { duration: 1200 }),
        ),
        -1,
        true,
      );
    }
  }, [status?.inUnderworld]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  const handleResurrect = useCallback(async () => {
    try {
      const result = await resurrectMutation({ userId });
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast(t('toast.risen'), result.xpBonus, 'level');
      } else {
        showToast(result.reason || t('toast.notReady'), undefined, 'error');
      }
    } catch {
      showToast(t('toast.failed'), undefined, 'error');
    }
  }, [userId, resurrectMutation, showToast]);

  if (!status || !status.inUnderworld) return null;

  const completed = status.daysCompleted ?? 0;
  const remaining = status.daysRemaining ?? 0;
  const progress = completed + remaining > 0 ? (completed / (completed + remaining)) * 100 : 0;

  return (
    <View style={styles.container}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.pulseBg, pulseStyle]} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surface }]} />
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Ionicons name="skull" size={20} color={colors.danger} />
          <Text style={styles.title}>{t('title')}</Text>
        </View>
        <Text style={styles.description}>
          {t('description', { count: status.daysRemaining })}
        </Text>
        <ProgressBar
          progress={progress}
          color={colors.danger}
          height={4}
          glowColor={colors.hpCritical}
        />
        {status.readyToResurrect ? (
          <Button title={t('resurrectButton')} onPress={handleResurrect} size="sm" />
        ) : null}
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.2)',
  },
  pulseBg: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
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
    fontSize: FontSize.sm,
    fontFamily: FontFamily.extrabold,
    color: colors.danger,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  description: {
    fontSize: FontSize.sm,
    color: colors.textSecondary,
  },
});
