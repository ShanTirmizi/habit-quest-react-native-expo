import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  RefreshControl,
  Animated,
} from 'react-native';
import { useToast } from '@/contexts/toast-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { FontSize, Spacing, Radius, FontFamily, Shadows, type ThemeColors } from '@/constants/theme';
import { GradientCard } from '@/components/ui/GradientCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import type { SideQuest, QuestPriority } from '@/types';
import { QUEST_PRIORITY_CONFIG } from '@/types';

export default function QuestsScreen() {
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();
  const { showToast } = useToast();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [completedExpanded, setCompletedExpanded] = useState(false);

  const rawQuests = useQuery(api.quests.getQuests, userId ? { userId } : 'skip');
  const addQuestMutation = useMutation(api.quests.addQuest);
  const completeQuestMutation = useMutation(api.quests.completeQuest);
  const uncompleteQuestMutation = useMutation(api.quests.uncompleteQuest);
  const deleteQuestMutation = useMutation(api.quests.deleteQuest);

  // Map Convex documents to local SideQuest type
  const quests: SideQuest[] = useMemo(() => {
    if (!rawQuests) return [];
    return rawQuests.map((q) => ({
      id: q._id,
      title: q.title,
      description: q.description,
      xpReward: q.xpReward,
      priority: q.priority,
      questType: q.questType,
      completed: q.completed,
      createdAt: new Date(q._creationTime).toISOString(),
      completedAt: q.completedAt,
    }));
  }, [rawQuests]);

  const pendingQuests = quests.filter((q) => !q.completed);
  const completedQuests = quests.filter((q) => q.completed);

  const handleComplete = useCallback(
    async (id: string) => {
      if (!userId) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      try {
        await completeQuestMutation({ questId: id as any, userId });
      } catch (error) {
        showToast('Failed to complete quest', undefined, 'error');
      }
    },
    [userId, completeQuestMutation, showToast]
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (!userId) return;
      Alert.alert(
        'Delete Quest',
        'Are you sure you want to delete this quest? This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              try {
                await deleteQuestMutation({ questId: id as any, userId });
              } catch (error) {
                showToast('Failed to delete quest', undefined, 'error');
              }
            },
          },
        ]
      );
    },
    [userId, deleteQuestMutation, showToast]
  );

  const handleUncomplete = useCallback(
    async (id: string) => {
      if (!userId) return;
      try {
        await uncompleteQuestMutation({ questId: id as any, userId });
      } catch (error) {
        showToast('Failed to undo quest', undefined, 'error');
      }
    },
    [userId, uncompleteQuestMutation, showToast]
  );

  const handleAdd = useCallback(
    async (quest: { title: string; description?: string; priority: QuestPriority }) => {
      if (!userId) return;
      const xp = QUEST_PRIORITY_CONFIG[quest.priority].xp;
      try {
        await addQuestMutation({
          userId,
          title: quest.title,
          description: quest.description,
          xpReward: xp,
          priority: quest.priority,
          questType: 'ongoing',
        });
      } catch (error) {
        showToast('Failed to create quest', undefined, 'error');
      }
    },
    [userId, addQuestMutation, showToast]
  );

  const isLoading = rawQuests === undefined;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Quests</Text>
          <View style={styles.badgeRow}>
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>{pendingQuests.length} active</Text>
            </View>
            <View style={styles.completedBadge}>
              <Text style={styles.completedBadgeText}>{completedQuests.length} completed</Text>
            </View>
          </View>
        </View>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowAddSheet(true);
          }}
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] }]}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <View style={{ gap: Spacing.sm, paddingHorizontal: Spacing.lg }}>
            <Skeleton width="40%" height={12} />
            <Skeleton height={120} borderRadius={Radius.xl} />
            <Skeleton height={120} borderRadius={Radius.xl} />
            <Skeleton height={120} borderRadius={Radius.xl} />
          </View>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                setTimeout(() => setRefreshing(false), 1000);
              }}
              tintColor={colors.primary}
            />
          }
        >
          {quests.length === 0 ? (
            <EmptyState
              icon="shield-outline"
              title="No quests yet"
              description="Side quests are one-off tasks that earn bonus XP. Create your first quest!"
              actionLabel="Create Quest"
              onAction={() => setShowAddSheet(true)}
            />
          ) : (
            <>
              {/* Active Quests */}
              {pendingQuests.length > 0 ? (
                <View style={styles.section}>
                  <View style={styles.activeQuestList}>
                    {pendingQuests.map((quest, i) => (
                        <ActiveQuestCard
                          key={quest.id}
                          quest={quest}
                          onComplete={handleComplete}
                          onDelete={handleDelete}
                          colors={colors}
                          styles={styles}
                          isDark={isDark}
                        />
                    ))}
                  </View>
                </View>
              ) : null}

              {/* Completed Quests - Collapsible */}
              {completedQuests.length > 0 ? (
                <View style={styles.completedSection}>
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setCompletedExpanded(!completedExpanded);
                    }}
                    style={({ pressed }) => [
                      styles.completedHeader,
                      pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
                    ]}
                  >
                    <Text style={styles.completedHeaderText}>
                      COMPLETED ({completedQuests.length})
                    </Text>
                    <Ionicons
                      name={completedExpanded ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={colors.textSecondary}
                    />
                  </Pressable>
                  {completedExpanded ? (
                    <View style={styles.completedList}>
                      {completedQuests.map((quest, i) => (
                          <CompletedQuestRow
                            key={quest.id}
                            quest={quest}
                            onUncomplete={handleUncomplete}
                            onDelete={handleDelete}
                            colors={colors}
                            styles={styles}
                          />
                      ))}
                    </View>
                  ) : null}
                </View>
              ) : null}
            </>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      <AddQuestSheet
        visible={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        onAdd={handleAdd}
        colors={colors}
        styles={styles}
      />
    </View>
  );
}

/* ─── Active Quest Card ──────────────────────────────────────────────────── */

const PRIORITY_CARD_COLORS_LIGHT: Record<string, string> = {
  low: '#24A894',     // teal
  medium: '#E29628',  // golden amber
  high: '#D44E82',    // hot pink
};

function ActiveQuestCard({
  quest,
  onComplete,
  onDelete,
  colors,
  styles,
  isDark,
}: {
  quest: SideQuest;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
  isDark: boolean;
}) {
  const priorityConfig = QUEST_PRIORITY_CONFIG[quest.priority];
  const btnScale = useRef(new Animated.Value(1)).current;
  const cardBg = !isDark ? PRIORITY_CARD_COLORS_LIGHT[quest.priority] : undefined;

  const handleComplete = useCallback(() => {
    Animated.sequence([
      Animated.spring(btnScale, { toValue: 0.85, useNativeDriver: true, speed: 50, bounciness: 0 }),
      Animated.spring(btnScale, { toValue: 1.15, useNativeDriver: true, speed: 50, bounciness: 0 }),
      Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 0 }),
    ]).start();
    onComplete(quest.id);
  }, [quest.id, onComplete, btnScale]);

  return (
    <GradientCard style={{ ...styles.activeCard, ...(cardBg ? { backgroundColor: cardBg } : {}) }}>
      {/* Top Row: Title + Delete */}
      <View style={styles.activeCardTopRow}>
        <Text style={styles.activeCardTitle} numberOfLines={2}>
          {quest.title}
        </Text>
        <Pressable
          onPress={() => onDelete(quest.id)}
          hitSlop={10}
          style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.5 }]}
        >
          <Ionicons name="trash-outline" size={17} color={isDark ? colors.textMuted : 'rgba(255,255,255,0.6)'} />
        </Pressable>
      </View>

      {/* Description */}
      {quest.description ? (
        <Text style={styles.activeCardDesc} numberOfLines={2}>
          {quest.description}
        </Text>
      ) : null}

      {/* Bottom Row: Priority + XP */}
      <View style={styles.activeCardBottomRow}>
        <View style={styles.priorityBadgeInline}>
          <Text style={styles.priorityBadgeInlineText}>{priorityConfig.label}</Text>
        </View>
        <View style={styles.xpBadge}>
          <Text style={styles.xpBadgeText}>+{quest.xpReward} XP</Text>
        </View>
      </View>

      {/* Complete Button */}
      <Animated.View style={{ transform: [{ scale: btnScale }] }}>
        <Pressable
          onPress={handleComplete}
          style={({ pressed }) => [
            styles.completeButton,
            pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
          ]}
        >
          <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.completeButtonText}>Complete</Text>
        </Pressable>
      </Animated.View>
    </GradientCard>
  );
}

/* ─── Completed Quest Row ────────────────────────────────────────────────── */

function CompletedQuestRow({
  quest,
  onUncomplete,
  onDelete,
  colors,
  styles,
}: {
  quest: SideQuest;
  onUncomplete: (id: string) => void;
  onDelete: (id: string) => void;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.completedRow}>
      <Text style={styles.completedRowTitle} numberOfLines={1}>
        {quest.title}
      </Text>
      <View style={styles.completedRowRight}>
        <View style={styles.completedXpBadge}>
          <Text style={styles.completedXpText}>+{quest.xpReward} XP</Text>
        </View>
        <Pressable
          onPress={() => onUncomplete(quest.id)}
          hitSlop={8}
          style={({ pressed }) => [styles.undoBtn, pressed && { opacity: 0.5 }]}
        >
          <Ionicons name="arrow-undo" size={15} color={colors.textMuted} />
        </Pressable>
        <Pressable
          onPress={() => onDelete(quest.id)}
          hitSlop={8}
          style={({ pressed }) => [styles.undoBtn, pressed && { opacity: 0.5 }]}
        >
          <Ionicons name="trash-outline" size={14} color={colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

/* ─── Add Quest Sheet ────────────────────────────────────────────────────── */

function AddQuestSheet({
  visible,
  onClose,
  onAdd,
  colors,
  styles,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (quest: { title: string; description?: string; priority: QuestPriority }) => void;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<QuestPriority>('medium');

  const handleSubmit = () => {
    if (!title.trim()) return;
    onAdd({ title: title.trim(), description: description.trim() || undefined, priority });
    setTitle('');
    setDescription('');
    setPriority('medium');
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="New Quest">
      <View style={styles.addForm}>
        <Input
          label="Quest Title"
          value={title}
          onChangeText={setTitle}
          placeholder="What's your side quest?"
        />
        <Input
          label="Description (optional)"
          value={description}
          onChangeText={setDescription}
          placeholder="Add some details..."
          multiline
          numberOfLines={2}
          containerStyle={{ marginTop: Spacing.md }}
        />
        <View style={styles.prioritySection}>
          <Text style={styles.priorityLabel}>Priority</Text>
          <View style={styles.priorityRow}>
            {(['low', 'medium', 'high'] as QuestPriority[]).map((p) => {
              const config = QUEST_PRIORITY_CONFIG[p];
              return (
                <Pressable
                  key={p}
                  onPress={() => setPriority(p)}
                  style={[
                    styles.priorityChip,
                    priority === p && {
                      backgroundColor: `${config.color}20`,
                      borderColor: config.color,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.priorityChipText,
                      priority === p && { color: config.color },
                    ]}
                  >
                    {config.label} ({config.xp} XP)
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={styles.addFormFooter}>
          <Button title="Cancel" variant="ghost" onPress={onClose} />
          <Button title="Create Quest" onPress={handleSubmit} disabled={!title.trim()} />
        </View>
      </View>
    </BottomSheet>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */

const createStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  headerLeft: {
    gap: Spacing.sm,
  },
  title: {
    fontSize: FontSize['3xl'],
    fontFamily: FontFamily.extrabold,
    color: colors.foreground,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  activeBadge: {
    backgroundColor: `${colors.primary}18`,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  activeBadgeText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semibold,
    color: colors.primary,
  },
  completedBadge: {
    backgroundColor: `${colors.success}18`,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  completedBadgeText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semibold,
    color: colors.success,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.neonGlow(colors.primary),
  },

  /* Loading */
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Scroll */
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },

  /* Sections */
  section: {
    gap: Spacing.sm,
  },
  activeQuestList: {
    gap: Spacing.md,
  },

  /* ── Active Quest Card ── */
  activeCard: {
    gap: Spacing.sm,
  },
  activeCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  activeCardTitle: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.bold,
    color: isDark ? colors.foreground : '#FFFFFF',
    flex: 1,
    marginRight: Spacing.sm,
  },
  deleteBtn: {
    padding: 4,
  },
  activeCardDesc: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: isDark ? colors.textSecondary : 'rgba(255,255,255,0.80)',
    lineHeight: 19,
  },
  activeCardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 2,
  },
  priorityBadgeInline: {
    backgroundColor: isDark ? colors.primaryBg : 'rgba(255,255,255,0.25)',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  priorityBadgeInlineText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bold,
    color: isDark ? colors.primary : '#FFFFFF',
  },
  xpBadge: {
    backgroundColor: isDark ? colors.primaryBg : 'rgba(255,255,255,0.25)',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  xpBadgeText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bold,
    color: isDark ? colors.primary : '#FFFFFF',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDark ? '#059669' : 'rgba(255,255,255,0.25)',
    paddingVertical: Spacing.sm + 4,
    borderRadius: Radius.lg,
    marginTop: Spacing.sm,
  },
  completeButtonText: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.bold,
    color: '#FFFFFF',
  },

  /* ── Completed Section ── */
  completedSection: {
    gap: Spacing.sm,
  },
  completedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    gap: Spacing.xs,
  },
  completedHeaderText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bold,
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  completedList: {
    gap: Spacing.xs,
  },

  /* ── Completed Quest Row ── */
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
  },
  completedRowTitle: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.medium,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
    flex: 1,
    marginRight: Spacing.sm,
  },
  completedRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  completedXpBadge: {
    backgroundColor: `${colors.success}18`,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  completedXpText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semibold,
    color: colors.success,
  },
  undoBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Add Quest Sheet ── */
  addForm: {
    paddingBottom: Spacing['2xl'],
  },
  prioritySection: {
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  priorityLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semibold,
    color: colors.textSecondary,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  priorityChip: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
  },
  priorityChipText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semibold,
    color: colors.textSecondary,
  },
  addFormFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
});
