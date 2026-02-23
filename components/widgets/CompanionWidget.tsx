import React, { useEffect, useCallback, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
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
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { Colors, FontSize, Spacing, Radius } from '@/constants/theme';
import { GlassCard } from '@/components/ui/GlassCard';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/contexts/toast-context';

const SPECIES_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  treant: 'leaf',
  phoenix: 'flame',
  owl: 'moon',
  keeper: 'flower',
};

const SPECIES_COLOR: Record<string, string> = {
  treant: Colors.categoryHealth,
  phoenix: Colors.accent,
  owl: Colors.categoryMind,
  keeper: Colors.categoryLife,
};

const MOOD_EMOJI: Record<string, string> = {
  happy: '😊',
  content: '😌',
  sleepy: '😴',
  worried: '😟',
};

interface CompanionWidgetProps {
  userId: Id<'users'>;
  completionRate: number;
  currentHp: number;
  maxHp: number;
}

export function CompanionWidget({ userId, completionRate, currentHp, maxHp }: CompanionWidgetProps) {
  const { showToast } = useToast();
  const [showDetail, setShowDetail] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');

  const companion = useQuery(api.companions.getCompanion, { userId });
  const unclaimedGifts = useQuery(api.companions.getUnclaimedGiftsCount, { userId });

  const getOrCreateMutation = useMutation(api.companions.getOrCreateCompanion);
  const updateMoodMutation = useMutation(api.companions.updateMood);
  const updateNameMutation = useMutation(api.companions.updateName);
  const claimGiftMutation = useMutation(api.companions.claimGift);

  // Breathing pulse for gift indicator
  const giftScale = useSharedValue(1);
  useEffect(() => {
    if (unclaimedGifts && unclaimedGifts > 0) {
      giftScale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 800 }),
          withTiming(1, { duration: 800 }),
        ),
        -1,
        true,
      );
    }
  }, [unclaimedGifts]);

  const giftAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: giftScale.value }],
  }));

  // Auto-update mood when widget mounts
  useEffect(() => {
    if (companion) {
      const hpCritical = maxHp > 0 ? (currentHp / maxHp) <= 0.2 : false;
      updateMoodMutation({ userId, completionRate, hpCritical }).catch(() => {});
    }
  }, [companion?._id, completionRate, currentHp]);

  const handleChooseCompanion = useCallback(async () => {
    try {
      await getOrCreateMutation({ userId });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast('Companion joined your quest!', undefined, 'xp');
    } catch {
      showToast('Failed to summon companion', undefined, 'error');
    }
  }, [userId, getOrCreateMutation, showToast]);

  const handleSaveName = useCallback(async () => {
    if (!newName.trim()) return;
    try {
      await updateNameMutation({ userId, name: newName.trim() });
      setEditingName(false);
      showToast('Companion renamed!', undefined, 'xp');
    } catch {
      showToast('Failed to rename companion', undefined, 'error');
    }
  }, [userId, newName, updateNameMutation, showToast]);

  const handleClaimGift = useCallback(async (giftId: string) => {
    try {
      const result = await claimGiftMutation({ userId, giftId });
      if (result.claimed) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast(`Gift claimed: ${result.giftType}!`, undefined, 'xp');
      }
    } catch {
      showToast('Failed to claim gift', undefined, 'error');
    }
  }, [userId, claimGiftMutation, showToast]);

  // No companion yet
  if (companion === null) {
    return (
      <GlassCard onPress={handleChooseCompanion}>
        <View style={styles.ctaRow}>
          <View style={styles.ctaIconCircle}>
            <Ionicons name="paw" size={20} color={Colors.primary} />
          </View>
          <View style={styles.ctaContent}>
            <Text style={styles.ctaTitle}>Choose Your Companion</Text>
            <Text style={styles.ctaSubtitle}>A loyal friend to join your quest</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textDim} />
        </View>
      </GlassCard>
    );
  }

  // Loading
  if (companion === undefined) return null;

  const speciesIcon = SPECIES_ICON[companion.species] || 'paw';
  const speciesColor = SPECIES_COLOR[companion.species] || Colors.primary;
  const moodEmoji = MOOD_EMOJI[companion.mood] || '😊';

  return (
    <>
      <GlassCard onPress={() => setShowDetail(true)}>
        <View style={styles.row}>
          <View style={[styles.iconCircle, { borderColor: speciesColor }]}>
            <Ionicons name={speciesIcon} size={20} color={speciesColor} />
          </View>
          <View style={styles.info}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{companion.name}</Text>
              <Text style={styles.mood}>{moodEmoji}</Text>
            </View>
            <Text style={styles.meta}>
              Stage {companion.evolutionStage} {companion.species.charAt(0).toUpperCase() + companion.species.slice(1)}
            </Text>
          </View>
          {unclaimedGifts && unclaimedGifts > 0 ? (
            <Animated.View style={giftAnimStyle}>
              <View style={styles.giftBadge}>
                <Ionicons name="gift" size={16} color={Colors.accent} />
                <Text style={styles.giftCount}>{unclaimedGifts}</Text>
              </View>
            </Animated.View>
          ) : null}
          <Ionicons name="chevron-forward" size={16} color={Colors.textDim} />
        </View>
      </GlassCard>

      {/* Detail Sheet */}
      <BottomSheet visible={showDetail} onClose={() => { setShowDetail(false); setEditingName(false); }} title={companion.name}>
        <View style={styles.detailContent}>
          <View style={[styles.detailIcon, { borderColor: speciesColor }]}>
            <Ionicons name={speciesIcon} size={40} color={speciesColor} />
          </View>

          <View style={styles.detailStats}>
            <View style={styles.detailStat}>
              <Text style={styles.detailStatValue}>{companion.evolutionStage}</Text>
              <Text style={styles.detailStatLabel}>Stage</Text>
            </View>
            <View style={styles.detailStat}>
              <Text style={styles.detailStatValue}>{companion.totalXp}</Text>
              <Text style={styles.detailStatLabel}>XP</Text>
            </View>
            <View style={styles.detailStat}>
              <Text style={styles.detailStatValue}>{moodEmoji}</Text>
              <Text style={styles.detailStatLabel}>{companion.mood}</Text>
            </View>
          </View>

          {/* Name editing */}
          {editingName ? (
            <View style={styles.nameEditRow}>
              <TextInput
                style={styles.nameInput}
                value={newName}
                onChangeText={setNewName}
                placeholder="New name..."
                placeholderTextColor={Colors.textDim}
                autoFocus
              />
              <Button title="Save" size="sm" onPress={handleSaveName} disabled={!newName.trim()} />
            </View>
          ) : (
            <Pressable onPress={() => { setNewName(companion.name); setEditingName(true); }}>
              <Text style={styles.editNameLink}>Rename companion</Text>
            </Pressable>
          )}

          {/* Gifts */}
          {companion.gifts && companion.gifts.length > 0 ? (
            <View style={styles.giftSection}>
              <Text style={styles.giftSectionTitle}>Unclaimed Gifts</Text>
              {companion.gifts.filter((g: any) => !g.claimed).map((gift: any) => (
                <Pressable
                  key={gift.id}
                  onPress={() => handleClaimGift(gift.id)}
                  style={({ pressed }) => [styles.giftItem, pressed && { opacity: 0.7 }]}
                >
                  <Ionicons name="gift" size={16} color={Colors.accent} />
                  <Text style={styles.giftLabel}>{gift.type.replace('_', ' ')}</Text>
                  <Text style={styles.giftClaim}>Claim</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  name: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.foreground,
  },
  mood: {
    fontSize: 14,
  },
  meta: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  giftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: Colors.accentBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  giftCount: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.accent,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  ctaIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaContent: {
    flex: 1,
  },
  ctaTitle: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.foreground,
  },
  ctaSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  detailContent: {
    alignItems: 'center',
    gap: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
  detailIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  detailStats: {
    flexDirection: 'row',
    gap: Spacing.xl,
  },
  detailStat: {
    alignItems: 'center',
  },
  detailStatValue: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.foreground,
  },
  detailStatLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  nameEditRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
    width: '100%',
  },
  nameInput: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.sm,
    color: Colors.foreground,
  },
  editNameLink: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: '600',
  },
  giftSection: {
    width: '100%',
    gap: Spacing.sm,
  },
  giftSectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  giftItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceLight,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  giftLabel: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.foreground,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  giftClaim: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.accent,
  },
});
