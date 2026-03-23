import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Skeleton } from '@/components/ui/Skeleton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { format, differenceInDays, parseISO } from 'date-fns';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id, Doc } from '@/convex/_generated/dataModel';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { FontSize, Spacing, Radius, FontFamily, Shadows, type ThemeColors } from '@/constants/theme';
import { GradientCard } from '@/components/ui/GradientCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { BadgePill } from '@/components/ui/BadgePill';
import { EmptyState } from '@/components/ui/EmptyState';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useToast } from '@/contexts/toast-context';
import { AddGoalWizard } from '@/components/goals/AddGoalWizard';
import type { Goal, GoalStatus, GoalCategory } from '@/types';
import { GOAL_CATEGORY_CONFIG, GOAL_STATUS_CONFIG } from '@/types';

type FilterValue = 'all' | GoalStatus;

/** Map a Convex goal document to the local Goal type */
function mapConvexGoal(raw: Doc<'goals'>): Goal {
  return {
    id: raw._id,
    userId: raw.userId,
    title: raw.title,
    description: raw.description,
    category: raw.category,
    targetDate: raw.targetDate,
    status: raw.status,
    currentLevel: raw.currentLevel,
    dailyTimeAvailable: raw.dailyTimeAvailable,
    constraints: raw.constraints,
    preferences: raw.preferences,
    linkedHabitIds: raw.linkedHabitIds?.map(String),
    milestones: raw.milestones,
    checkIns: raw.checkIns,
    phases: raw.phases?.map((p) => ({
      ...p,
      habitUpdates: p.habitUpdates.map((hu) => ({
        habitId: String(hu.habitId),
        newName: hu.newName,
        newXpReward: hu.newXpReward,
      })),
    })),
    currentPhaseIndex: raw.currentPhaseIndex,
    createdAt: raw._creationTime
      ? new Date(raw._creationTime).toISOString()
      : new Date().toISOString(),
  };
}

export default function GoalsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const { showToast } = useToast();
  const [filter, setFilter] = useState<FilterValue>('all');
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Convex queries & mutations
  const rawGoals = useQuery(api.goals.getGoals, userId ? { userId } : 'skip');
  const completeMilestoneMutation = useMutation(api.goals.completeMilestone);
  const uncompleteMilestoneMutation = useMutation(api.goals.uncompleteMilestone);
  const updateGoalMutation = useMutation(api.goals.updateGoal);
  const updateGoalStatusMutation = useMutation(api.goals.updateGoalStatus);
  const deleteGoalMutation = useMutation(api.goals.deleteGoal);

  // Fetch goal details (with linked habits) when a goal is selected
  const goalDetails = useQuery(
    api.goals.getGoalById,
    selectedGoal && userId ? { goalId: selectedGoal.id as Id<'goals'>, userId } : 'skip'
  );

  // Map Convex documents to local Goal type
  const goals: Goal[] = useMemo(() => {
    if (!rawGoals) return [];
    return rawGoals.map(mapConvexGoal);
  }, [rawGoals]);

  const filteredGoals = useMemo(() => {
    if (filter === 'all') return goals;
    return goals.filter((g) => g.status === filter);
  }, [goals, filter]);

  const activeCount = goals.filter((g) => g.status === 'active').length;
  const achievedCount = goals.filter((g) => g.status === 'achieved').length;

  // Delete goal handler
  const handleDeleteGoal = useCallback((goal: Goal) => {
    const hasLinkedHabits = goal.linkedHabitIds && goal.linkedHabitIds.length > 0;

    if (hasLinkedHabits) {
      Alert.alert(
        'Delete Goal',
        `"${goal.title}" has linked habits. What would you like to do?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Keep Habits',
            onPress: async () => {
              if (!userId) return;
              try {
                await deleteGoalMutation({ goalId: goal.id as Id<'goals'>, userId, deleteLinkedHabits: false });
                setSelectedGoal(null);
                showToast('Goal deleted', undefined, 'hp');
              } catch {
                showToast('Failed to delete goal', undefined, 'error');
              }
            },
          },
          {
            text: 'Delete All',
            style: 'destructive',
            onPress: async () => {
              if (!userId) return;
              try {
                await deleteGoalMutation({ goalId: goal.id as Id<'goals'>, userId, deleteLinkedHabits: true });
                setSelectedGoal(null);
                showToast('Goal and linked habits deleted', undefined, 'hp');
              } catch {
                showToast('Failed to delete goal', undefined, 'error');
              }
            },
          },
        ]
      );
    } else {
      Alert.alert(
        'Delete Goal',
        `Are you sure you want to delete "${goal.title}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              if (!userId) return;
              try {
                await deleteGoalMutation({ goalId: goal.id as Id<'goals'>, userId });
                setSelectedGoal(null);
                showToast('Goal deleted', undefined, 'hp');
              } catch {
                showToast('Failed to delete goal', undefined, 'error');
              }
            },
          },
        ]
      );
    }
  }, [userId, deleteGoalMutation, showToast]);

  // Update goal handler
  const handleUpdateGoal = useCallback(async (
    goalId: string,
    updates: { title?: string; description?: string; category?: GoalCategory; targetDate?: string }
  ) => {
    if (!userId) return;
    try {
      await updateGoalMutation({
        goalId: goalId as Id<'goals'>,
        userId,
        ...updates,
      });
      // Update selected goal locally
      setSelectedGoal((prev) => prev ? { ...prev, ...updates } : null);
      showToast('Goal updated', undefined, 'xp');
    } catch {
      showToast('Failed to update goal', undefined, 'error');
    }
  }, [userId, updateGoalMutation, showToast]);

  // Update goal status handler
  const handleUpdateStatus = useCallback(async (goalId: string, status: GoalStatus) => {
    if (!userId) return;
    try {
      await updateGoalStatusMutation({
        goalId: goalId as Id<'goals'>,
        userId,
        status,
      });
      setSelectedGoal((prev) => prev ? { ...prev, status } : null);
      showToast(`Goal marked as ${GOAL_STATUS_CONFIG[status].label.toLowerCase()}`, undefined, 'xp');
    } catch {
      showToast('Failed to update status', undefined, 'error');
    }
  }, [userId, updateGoalStatusMutation, showToast]);

  // Loading state
  if (rawGoals === undefined) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Goals</Text>
            <Text style={styles.subtitle}>Loading...</Text>
          </View>
        </View>
        <View style={{ paddingHorizontal: Spacing.lg, gap: Spacing.md }}>
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <Skeleton width={60} height={28} borderRadius={Radius.full} />
            <Skeleton width={70} height={28} borderRadius={Radius.full} />
            <Skeleton width={80} height={28} borderRadius={Radius.full} />
          </View>
          <Skeleton height={140} borderRadius={Radius.xl} />
          <Skeleton height={140} borderRadius={Radius.xl} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Goals</Text>
          <View style={styles.badgeRow}>
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>{activeCount} active</Text>
            </View>
            <View style={styles.achievedBadge}>
              <Text style={styles.achievedBadgeText}>{achievedCount} achieved</Text>
            </View>
          </View>
        </View>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowAddSheet(true);
          }}
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.7, transform: [{ scale: 0.92 }] }]}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Filter Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterScroll}
      >
        {(['all', 'active', 'achieved', 'paused'] as FilterValue[]).map((f) => {
          const isActive = filter === f;
          const label = f === 'all' ? 'All' : GOAL_STATUS_CONFIG[f as GoalStatus]?.label || f;
          return (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

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
        {filteredGoals.length === 0 ? (
          <EmptyState
            icon="flag-outline"
            title="No goals yet"
            description="Set meaningful goals and let AI generate habits to help you achieve them."
            actionLabel="Create Goal"
            onAction={() => setShowAddSheet(true)}
          />
        ) : (
          <View style={styles.goalGrid}>
            {filteredGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onPress={() => setSelectedGoal(goal)}
                colors={colors}
                styles={styles}
                isDark={isDark}
              />
            ))}
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {userId && (
        <AddGoalWizard
          visible={showAddSheet}
          onClose={() => setShowAddSheet(false)}
          userId={userId}
        />
      )}

      {/* Goal Detail */}
      <BottomSheet
        visible={!!selectedGoal}
        onClose={() => setSelectedGoal(null)}
        title={selectedGoal?.title}
      >
        {selectedGoal ? (
          <GoalDetail
            goal={selectedGoal}
            linkedHabits={goalDetails?.linkedHabits ?? []}
            onDelete={() => handleDeleteGoal(selectedGoal)}
            onUpdate={handleUpdateGoal}
            onUpdateStatus={handleUpdateStatus}
            onToggleMilestone={async (goalId, milestoneId, completed) => {
              if (!userId) return;
              try {
                if (completed) {
                  // Uncomplete it
                  await uncompleteMilestoneMutation({
                    goalId: goalId as Id<'goals'>,
                    userId,
                    milestoneId,
                  });
                  setSelectedGoal((prev) => {
                    if (!prev) return null;
                    return {
                      ...prev,
                      milestones: prev.milestones?.map((m) =>
                        m.id === milestoneId
                          ? { ...m, completed: false, completedAt: undefined }
                          : m
                      ),
                    };
                  });
                  showToast('Milestone uncompleted', undefined, 'hp');
                } else {
                  // Complete it
                  await completeMilestoneMutation({
                    goalId: goalId as Id<'goals'>,
                    userId,
                    milestoneId,
                  });
                  setSelectedGoal((prev) => {
                    if (!prev) return null;
                    return {
                      ...prev,
                      milestones: prev.milestones?.map((m) =>
                        m.id === milestoneId
                          ? { ...m, completed: true, completedAt: new Date().toISOString() }
                          : m
                      ),
                    };
                  });
                  showToast('Milestone completed!', undefined, 'xp');
                }
              } catch {
                showToast('Failed to update milestone', undefined, 'error');
              }
            }}
            colors={colors}
            styles={styles}
            isDark={isDark}
          />
        ) : null}
      </BottomSheet>
    </View>
  );
}

const GOAL_CARD_BG_MAP: Record<string, string> = {
  health: '#2AB872',
  career: '#E29628',
  mind: '#D44E82',
  life: '#24A894',
};

function GoalCard({ goal, onPress, colors, styles, isDark }: { goal: Goal; onPress: () => void; colors: ThemeColors; styles: ReturnType<typeof createStyles>; isDark: boolean }) {
  const categoryConfig = GOAL_CATEGORY_CONFIG[goal.category];
  const statusConfig = GOAL_STATUS_CONFIG[goal.status];
  const daysRemaining = differenceInDays(parseISO(goal.targetDate), new Date());
  const completedMilestones = goal.milestones?.filter((m) => m.completed).length || 0;
  const totalMilestones = goal.milestones?.length || 0;
  const progress = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;
  const cardBg = !isDark ? (GOAL_CARD_BG_MAP[goal.category] ?? colors.primary) : undefined;

  return (
    <GradientCard onPress={onPress} style={{ ...styles.goalCard, ...(cardBg ? { backgroundColor: cardBg } : {}) }}>
      <View style={styles.goalTop}>
        <Ionicons name={categoryConfig.icon as keyof typeof Ionicons.glyphMap} size={24} color={isDark ? categoryConfig.color : '#FFFFFF'} />
        <View style={styles.goalStatusBadge}>
          <Text style={styles.goalStatusText}>{statusConfig.label}</Text>
        </View>
      </View>
      <Text style={styles.goalTitle} numberOfLines={2}>{goal.title}</Text>
      {goal.description ? (
        <Text style={styles.goalDesc} numberOfLines={2}>{goal.description}</Text>
      ) : null}

      {totalMilestones > 0 ? (
        <View style={styles.goalProgress}>
          <ProgressBar
            progress={progress}
            color={isDark ? categoryConfig.color : '#FFFFFF'}
            height={4}
          />
          <Text style={styles.goalMilestones}>
            {completedMilestones}/{totalMilestones} milestones
          </Text>
        </View>
      ) : null}

      <View style={styles.goalFooter}>
        <View style={styles.goalCategoryBadge}>
          <Text style={styles.goalCategoryText}>{categoryConfig.label}</Text>
        </View>
        <Text style={[
          styles.goalDays,
          isDark && daysRemaining < 14 && { color: colors.warning },
          isDark && daysRemaining < 0 && { color: colors.danger },
        ]}>
          {daysRemaining > 0 ? `${daysRemaining}d left` : daysRemaining === 0 ? 'Today!' : 'Overdue'}
        </Text>
      </View>
    </GradientCard>
  );
}

interface LinkedHabit {
  _id: Id<'habits'>;
  name: string;
  category: string;
  xpReward: number;
  streak: number;
}

const HABIT_CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  health: 'heart',
  career: 'briefcase',
  mind: 'book',
  life: 'people',
};

const HABIT_CATEGORY_COLORS: Record<string, string> = {
  health: '#2AB872',
  career: '#E29628',
  mind: '#D44E82',
  life: '#24A894',
};

function GoalDetail({
  goal,
  linkedHabits,
  onToggleMilestone,
  onDelete,
  onUpdate,
  onUpdateStatus,
  colors,
  styles,
  isDark,
}: {
  goal: Goal;
  linkedHabits: LinkedHabit[];
  onToggleMilestone: (goalId: string, milestoneId: string, currentlyCompleted: boolean) => void;
  onDelete: () => void;
  onUpdate: (goalId: string, updates: { title?: string; description?: string; category?: GoalCategory; targetDate?: string }) => void;
  onUpdateStatus: (goalId: string, status: GoalStatus) => void;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
  isDark: boolean;
}) {
  const categoryConfig = GOAL_CATEGORY_CONFIG[goal.category];
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(goal.title);
  const [editDescription, setEditDescription] = useState(goal.description ?? '');

  const handleSaveEdit = () => {
    const updates: { title?: string; description?: string } = {};
    if (editTitle.trim() && editTitle !== goal.title) updates.title = editTitle.trim();
    if (editDescription.trim() !== (goal.description ?? '')) updates.description = editDescription.trim() || undefined;
    if (Object.keys(updates).length > 0) {
      onUpdate(goal.id, updates);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditTitle(goal.title);
    setEditDescription(goal.description ?? '');
    setIsEditing(false);
  };

  return (
    <View style={styles.detailContainer}>
      {/* Action buttons row */}
      <View style={styles.detailActions}>
        <Pressable
          onPress={() => {
            if (isEditing) {
              handleSaveEdit();
            } else {
              setIsEditing(true);
            }
          }}
          style={({ pressed }) => [styles.detailActionBtn, pressed && { opacity: 0.7 }]}
        >
          <Ionicons
            name={isEditing ? 'checkmark' : 'create-outline'}
            size={16}
            color={isEditing ? colors.success : colors.primary}
          />
          <Text style={[styles.detailActionText, { color: isEditing ? colors.success : colors.primary }]}>
            {isEditing ? 'Save' : 'Edit'}
          </Text>
        </Pressable>

        {isEditing ? (
          <Pressable
            onPress={handleCancelEdit}
            style={({ pressed }) => [styles.detailActionBtn, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="close" size={16} color={colors.textMuted} />
            <Text style={[styles.detailActionText, { color: colors.textMuted }]}>Cancel</Text>
          </Pressable>
        ) : null}

        <View style={{ flex: 1 }} />

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onDelete();
          }}
          style={({ pressed }) => [styles.detailActionBtn, styles.detailDeleteBtn, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="trash-outline" size={16} color={colors.danger} />
          <Text style={[styles.detailActionText, { color: colors.danger }]}>Delete</Text>
        </Pressable>
      </View>

      {/* Editable title & description */}
      {isEditing ? (
        <View style={styles.editSection}>
          <Text style={styles.editLabel}>Title</Text>
          <TextInput
            value={editTitle}
            onChangeText={setEditTitle}
            style={styles.editInput}
            placeholderTextColor={colors.textMuted}
            placeholder="Goal title"
          />
          <Text style={styles.editLabel}>Description</Text>
          <TextInput
            value={editDescription}
            onChangeText={setEditDescription}
            style={[styles.editInput, styles.editInputMultiline]}
            placeholderTextColor={colors.textMuted}
            placeholder="Goal description (optional)"
            multiline
            numberOfLines={3}
          />
        </View>
      ) : goal.description ? (
        <Text style={styles.detailDesc}>{goal.description}</Text>
      ) : null}

      {/* Status selector */}
      <View style={styles.statusSection}>
        <Text style={styles.detailSectionTitle}>Status</Text>
        <View style={styles.statusRow}>
          {(['active', 'achieved', 'paused', 'abandoned'] as GoalStatus[]).map((s) => {
            const config = GOAL_STATUS_CONFIG[s];
            const isActive = goal.status === s;
            return (
              <Pressable
                key={s}
                onPress={() => {
                  if (!isActive) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onUpdateStatus(goal.id, s);
                  }
                }}
                style={[
                  styles.statusChip,
                  isActive && { backgroundColor: `${config.color}20`, borderColor: config.color },
                ]}
              >
                <Ionicons
                  name={config.icon as keyof typeof Ionicons.glyphMap}
                  size={12}
                  color={isActive ? config.color : colors.textMuted}
                />
                <Text style={[styles.statusChipText, isActive && { color: config.color }]}>
                  {config.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.detailMeta}>
        <View style={styles.detailMetaItem}>
          <Text style={styles.detailMetaLabel}>Category</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name={categoryConfig.icon as keyof typeof Ionicons.glyphMap} size={14} color={categoryConfig.color} />
            <Text style={[styles.detailMetaValue, { color: categoryConfig.color }]}>{categoryConfig.label}</Text>
          </View>
        </View>
        <View style={styles.detailMetaItem}>
          <Text style={styles.detailMetaLabel}>Target Date</Text>
          <Text style={styles.detailMetaValue}>
            {format(parseISO(goal.targetDate), 'MMM d, yyyy')}
          </Text>
        </View>
        {goal.currentLevel ? (
          <View style={styles.detailMetaItem}>
            <Text style={styles.detailMetaLabel}>Level</Text>
            <Text style={styles.detailMetaValue}>
              {goal.currentLevel.charAt(0).toUpperCase() + goal.currentLevel.slice(1)}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Linked Habits */}
      {linkedHabits.length > 0 ? (
        <View style={styles.linkedHabitsSection}>
          <Text style={styles.detailSectionTitle}>Linked Habits</Text>
          {linkedHabits.map((habit) => {
            const habitColor = HABIT_CATEGORY_COLORS[habit.category] ?? colors.primary;
            const habitIcon = HABIT_CATEGORY_ICONS[habit.category] ?? 'ellipse';
            return (
              <View key={habit._id} style={styles.linkedHabitItem}>
                <View style={[styles.linkedHabitIcon, { backgroundColor: `${habitColor}18` }]}>
                  <Ionicons name={habitIcon} size={14} color={habitColor} />
                </View>
                <View style={styles.linkedHabitInfo}>
                  <Text style={styles.linkedHabitName} numberOfLines={1}>{habit.name}</Text>
                  <View style={styles.linkedHabitStats}>
                    <View style={styles.linkedHabitStat}>
                      <Ionicons name="flame" size={11} color={colors.accent} />
                      <Text style={styles.linkedHabitStatText}>{habit.streak}</Text>
                    </View>
                    <View style={styles.linkedHabitStat}>
                      <Ionicons name="star" size={11} color={colors.primary} />
                      <Text style={styles.linkedHabitStatText}>{habit.xpReward} XP</Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {/* Milestones */}
      {goal.milestones && goal.milestones.length > 0 ? (
        <View style={styles.milestonesSection}>
          <Text style={styles.detailSectionTitle}>Milestones</Text>
          {goal.milestones.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => {
                Haptics.impactAsync(
                  m.completed
                    ? Haptics.ImpactFeedbackStyle.Light
                    : Haptics.ImpactFeedbackStyle.Medium
                );
                onToggleMilestone(goal.id, m.id, m.completed);
              }}
              style={({ pressed }) => [styles.milestoneItem, pressed && { opacity: 0.7 }]}
            >
              <View style={[styles.milestoneCheck, m.completed && styles.milestoneCheckDone]}>
                {m.completed ? (
                  <Ionicons name="checkmark" size={12} color={colors.background} />
                ) : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.milestoneTitle, m.completed && styles.milestoneTitleDone]}>
                  {m.title}
                </Text>
                <Text style={styles.milestoneDate}>
                  {m.completed && m.completedAt
                    ? `Completed ${format(parseISO(m.completedAt), 'MMM d, yyyy')}`
                    : format(parseISO(m.targetDate), 'MMM d, yyyy')
                  }
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}

      {/* Check-ins */}
      {goal.checkIns && goal.checkIns.length > 0 ? (
        <View style={styles.checkInsSection}>
          <Text style={styles.detailSectionTitle}>Check-ins</Text>
          {goal.checkIns.map((ci, i) => (
            <View key={i} style={styles.checkInItem}>
              <Text style={styles.checkInDate}>{format(parseISO(ci.date), 'MMM d')}</Text>
              <BadgePill
                label={ci.status.replace('_', ' ')}
                color={
                  ci.status === 'on_track' ? colors.success :
                  ci.status === 'ahead' ? colors.info :
                  ci.status === 'struggling' ? colors.warning :
                  colors.textMuted
                }
                size="sm"
              />
              {ci.note ? <Text style={styles.checkInNote}>{ci.note}</Text> : null}
            </View>
          ))}
        </View>
      ) : null}

      <View style={{ height: Spacing['2xl'] }} />
    </View>
  );
}

const createStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLeft: {
    flex: 1,
    gap: Spacing.sm,
  },
  title: {
    fontSize: FontSize['3xl'],
    fontFamily: FontFamily.extrabold,
    color: colors.foreground,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
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
  achievedBadge: {
    backgroundColor: `${colors.success}18`,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  achievedBadgeText: {
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterRow: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLight,
  },
  filterChipActive: {
    backgroundColor: colors.primaryBg,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.medium,
    color: colors.textMuted,
  },
  filterChipTextActive: {
    color: colors.primary,
    fontFamily: FontFamily.semibold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  goalGrid: {
    gap: Spacing.md,
  },
  goalCard: {
    gap: Spacing.sm,
    borderRadius: Radius.xl,
    ...Shadows.card,
  },
  goalTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalIcon: {
    fontSize: 24,
  },
  goalTitle: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.bold,
    color: isDark ? colors.foreground : '#FFFFFF',
  },
  goalDesc: {
    fontSize: FontSize.sm,
    color: isDark ? colors.textSecondary : 'rgba(255,255,255,0.80)',
    lineHeight: 18,
  },
  goalProgress: {
    gap: Spacing.xs,
  },
  goalMilestones: {
    fontSize: FontSize.xs,
    color: isDark ? colors.textMuted : 'rgba(255,255,255,0.70)',
  },
  goalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  goalDays: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semibold,
    color: isDark ? colors.textSecondary : 'rgba(255,255,255,0.80)',
  },
  goalStatusBadge: {
    backgroundColor: isDark ? `${colors.primary}18` : 'rgba(255,255,255,0.25)',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  goalStatusText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semibold,
    color: isDark ? colors.primary : '#FFFFFF',
  },
  goalCategoryBadge: {
    backgroundColor: isDark ? `${colors.primary}18` : 'rgba(255,255,255,0.25)',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  goalCategoryText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semibold,
    color: isDark ? colors.primary : '#FFFFFF',
  },
  // Detail
  detailContainer: {
    gap: Spacing.lg,
    paddingBottom: Spacing['2xl'],
  },
  detailActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  detailActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    backgroundColor: colors.surfaceLight,
  },
  detailDeleteBtn: {
    backgroundColor: `${colors.danger}12`,
  },
  detailActionText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semibold,
  },
  editSection: {
    gap: Spacing.sm,
  },
  editLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semibold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editInput: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: colors.foreground,
    backgroundColor: colors.surfaceLight,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  editInputMultiline: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  statusSection: {
    gap: Spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 1,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLight,
  },
  statusChipText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.medium,
    color: colors.textMuted,
  },
  detailDesc: {
    fontSize: FontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  detailMeta: {
    gap: Spacing.sm,
  },
  detailMetaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailMetaLabel: {
    fontSize: FontSize.sm,
    color: colors.textMuted,
  },
  detailMetaValue: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semibold,
    color: colors.foreground,
  },
  detailSectionTitle: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  // Linked habits
  linkedHabitsSection: {
    gap: Spacing.xs,
  },
  linkedHabitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  linkedHabitIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkedHabitInfo: {
    flex: 1,
    gap: 2,
  },
  linkedHabitName: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semibold,
    color: colors.foreground,
  },
  linkedHabitStats: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  linkedHabitStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  linkedHabitStatText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.medium,
    color: colors.textMuted,
  },
  milestonesSection: {},
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  milestoneCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneCheckDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  milestoneTitle: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semibold,
    color: colors.foreground,
  },
  milestoneTitleDone: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  milestoneDate: {
    fontSize: FontSize.xs,
    color: colors.textMuted,
  },
  checkInsSection: {},
  checkInItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  checkInDate: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semibold,
    color: colors.textSecondary,
    width: 50,
  },
  checkInNote: {
    fontSize: FontSize.xs,
    color: colors.textMuted,
    flex: 1,
  },
});
