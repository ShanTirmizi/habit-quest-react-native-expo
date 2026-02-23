import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { Colors, FontSize, Spacing, Radius } from '@/constants/theme';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/contexts/toast-context';

interface UnderworldOverlayProps {
  userId: Id<'users'>;
}

export function UnderworldOverlay({ userId }: UnderworldOverlayProps) {
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
        showToast('You have risen! HP restored.', result.xpBonus, 'level');
      } else {
        showToast(result.reason || 'Not ready yet', undefined, 'error');
      }
    } catch {
      showToast('Failed to resurrect', undefined, 'error');
    }
  }, [userId, resurrectMutation, showToast]);

  if (!status || !status.inUnderworld) return null;

  const progress = status.daysCompleted / (status.daysCompleted + status.daysRemaining) * 100;

  return (
    <View style={styles.container}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.pulseBg, pulseStyle]} />
      <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Ionicons name="skull" size={20} color={Colors.danger} />
          <Text style={styles.title}>The Underworld</Text>
        </View>
        <Text style={styles.description}>
          Complete habits for {status.daysRemaining} more {status.daysRemaining === 1 ? 'day' : 'days'} to resurrect
        </Text>
        <ProgressBar
          progress={progress}
          color={Colors.danger}
          height={4}
          glowColor={Colors.hpCritical}
        />
        {status.readyToResurrect ? (
          <Button title="Resurrect" onPress={handleResurrect} size="sm" />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  pulseBg: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
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
    fontWeight: '800',
    color: Colors.danger,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  description: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
});
