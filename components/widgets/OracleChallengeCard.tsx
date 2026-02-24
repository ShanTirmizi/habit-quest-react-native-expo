import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { Colors, FontSize, Spacing, Radius, FontFamily } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/contexts/toast-context';

interface OracleChallengeCardProps {
  userId: Id<'users'>;
}

export function OracleChallengeCard({ userId }: OracleChallengeCardProps) {
  const { showToast } = useToast();
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
      showToast('The Oracle speaks...', undefined, 'xp');
    } catch {
      showToast('The Oracle is silent...', undefined, 'error');
    }
  }, [userId, generateMutation, showToast]);

  const handleAccept = useCallback(async () => {
    if (!challenge || actionLoading) return;
    setActionLoading(true);
    try {
      await acceptMutation({ userId, challengeId: challenge._id });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Challenge accepted!', undefined, 'xp');
    } catch (err) {
      showToast('Failed to accept challenge', undefined, 'error');
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
      showToast('Challenge completed!', result.xpReward, 'xp');
    } catch {
      showToast('Failed to complete challenge', undefined, 'error');
    } finally {
      setActionLoading(false);
    }
  }, [userId, challenge, actionLoading, completeMutation, showToast]);

  const handleDismiss = useCallback(async () => {
    if (!challenge || actionLoading) return;
    setActionLoading(true);
    try {
      await dismissMutation({ userId, challengeId: challenge._id });
      showToast('Challenge dismissed', undefined, 'hp');
    } catch {
      showToast('Failed to dismiss', undefined, 'error');
    } finally {
      setActionLoading(false);
    }
  }, [userId, challenge, actionLoading, dismissMutation, showToast]);

  // No active challenge
  if (challenge === null) {
    return (
      <View style={styles.wrapper}>
        <LinearGradient
          colors={['rgba(179,102,255,0.08)', 'rgba(179,102,255,0.02)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Ionicons name="eye-outline" size={20} color={Colors.categoryMind} />
            <Text style={styles.title}>Oracle Challenge</Text>
          </View>
          <Text style={styles.description}>Consult the Oracle for a daily challenge and earn bonus XP.</Text>
          <Button title="Consult the Oracle" onPress={handleGenerate} size="sm" />
        </View>
      </View>
    );
  }

  if (challenge === undefined) return null;

  const isAccepted = challenge.accepted && !challenge.completed;
  const isPending = !challenge.accepted && !challenge.completed;

  return (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={['rgba(179,102,255,0.12)', 'rgba(179,102,255,0.03)']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Ionicons name="eye" size={20} color={Colors.categoryMind} />
          <Text style={styles.title}>Oracle Challenge</Text>
          <Text style={styles.xpBadge}>+{challenge.xpReward} XP</Text>
        </View>
        <Text style={styles.challengeText}>{challenge.challengeText}</Text>
        <View style={styles.actions}>
          {isPending ? (
            <>
              <Button title="Accept" onPress={handleAccept} size="sm" loading={actionLoading} disabled={actionLoading} />
              <Button title="Dismiss" onPress={handleDismiss} size="sm" variant="ghost" disabled={actionLoading} />
            </>
          ) : isAccepted ? (
            <Button title="Complete" onPress={handleComplete} size="sm" loading={actionLoading} disabled={actionLoading} />
          ) : challenge.completed ? (
            <View style={styles.completedBadge}>
              <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
              <Text style={styles.completedText}>Completed</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(179,102,255,0.15)',
    overflow: 'hidden',
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
    color: Colors.categoryMind,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  xpBadge: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.extrabold,
    color: Colors.primary,
  },
  description: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  challengeText: {
    fontSize: FontSize.sm,
    color: Colors.foreground,
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
    fontFamily: FontFamily.semibold,
    color: Colors.success,
  },
});
