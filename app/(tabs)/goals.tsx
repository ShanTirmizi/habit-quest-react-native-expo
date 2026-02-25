import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { format, differenceInDays, parseISO } from 'date-fns';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { FontSize, Spacing, Radius, FontFamily, Shadows, type ThemeColors } from '@/constants/theme';
import { GradientCard } from '@/components/ui/GradientCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { BadgePill } from '@/components/ui/BadgePill';
import { EmptyState } from '@/components/ui/EmptyState';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/contexts/toast-context';
import type { Goal, GoalCategory, GoalStatus } from '@/types';
import { GOAL_CATEGORY_CONFIG, GOAL_STATUS_CONFIG } from '@/types';

type FilterValue = 'all' | GoalStatus;

/** Map a Convex goal document to the local Goal type */
function mapConvexGoal(raw: any): Goal {
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
    linkedHabitIds: raw.linkedHabitIds,
    milestones: raw.milestones,
    checkIns: raw.checkIns,
    phases: raw.phases,
    currentPhaseIndex: raw.currentPhaseIndex,
    createdAt: raw._creationTime
      ? new Date(raw._creationTime).toISOString()
      : new Date().toISOString(),
  };
}

export default function GoalsScreen() {
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { showToast } = useToast();
  const [filter, setFilter] = useState<FilterValue>('all');
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Convex queries & mutations
  const rawGoals = useQuery(api.goals.getGoals, userId ? { userId } : 'skip');
  const createGoalMutation = useMutation(api.goals.createGoal);
  const completeMilestoneMutation = useMutation(api.goals.completeMilestone);

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
              />
            ))}
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      <AddGoalSheet
        visible={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        onAdd={async (goalData) => {
          if (!userId) return;
          try {
            await createGoalMutation({
              userId,
              title: goalData.title,
              description: goalData.description,
              category: goalData.category,
              targetDate: goalData.targetDate,
            });
          } catch (error) {
            showToast('Failed to create goal', undefined, 'error');
          }
        }}
        colors={colors}
        styles={styles}
      />

      {/* Goal Detail */}
      <BottomSheet
        visible={!!selectedGoal}
        onClose={() => setSelectedGoal(null)}
        title={selectedGoal?.title}
      >
        {selectedGoal ? (
          <GoalDetail
            goal={selectedGoal}
            onCompleteMilestone={async (goalId, milestoneId) => {
              if (!userId) return;
              try {
                await completeMilestoneMutation({
                  goalId: goalId as any,
                  userId,
                  milestoneId,
                });
                // Update selected goal locally so the sheet reflects the change
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
              } catch (error) {
                showToast('Failed to complete milestone', undefined, 'error');
              }
            }}
            colors={colors}
            styles={styles}
          />
        ) : null}
      </BottomSheet>
    </View>
  );
}

function GoalCard({ goal, onPress, colors, styles }: { goal: Goal; onPress: () => void; colors: ThemeColors; styles: ReturnType<typeof createStyles> }) {
  const categoryConfig = GOAL_CATEGORY_CONFIG[goal.category];
  const statusConfig = GOAL_STATUS_CONFIG[goal.status];
  const daysRemaining = differenceInDays(parseISO(goal.targetDate), new Date());
  const completedMilestones = goal.milestones?.filter((m) => m.completed).length || 0;
  const totalMilestones = goal.milestones?.length || 0;
  const progress = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;

  return (
    <GradientCard onPress={onPress} style={styles.goalCard}>
      <View style={styles.goalTop}>
        <Ionicons name={categoryConfig.icon as keyof typeof Ionicons.glyphMap} size={24} color={categoryConfig.color} />
        <BadgePill
          label={statusConfig.label}
          icon={statusConfig.icon}
          color={statusConfig.color}
          size="sm"
        />
      </View>
      <Text style={styles.goalTitle} numberOfLines={2}>{goal.title}</Text>
      {goal.description ? (
        <Text style={styles.goalDesc} numberOfLines={2}>{goal.description}</Text>
      ) : null}

      {totalMilestones > 0 ? (
        <View style={styles.goalProgress}>
          <ProgressBar
            progress={progress}
            color={categoryConfig.color}
            height={4}
          />
          <Text style={styles.goalMilestones}>
            {completedMilestones}/{totalMilestones} milestones
          </Text>
        </View>
      ) : null}

      <View style={styles.goalFooter}>
        <BadgePill
          label={categoryConfig.label}
          color={categoryConfig.color}
          size="sm"
        />
        <Text style={[
          styles.goalDays,
          daysRemaining < 14 && { color: colors.warning },
          daysRemaining < 0 && { color: colors.danger },
        ]}>
          {daysRemaining > 0 ? `${daysRemaining}d left` : daysRemaining === 0 ? 'Today!' : 'Overdue'}
        </Text>
      </View>
    </GradientCard>
  );
}

function GoalDetail({
  goal,
  onCompleteMilestone,
  colors,
  styles,
}: {
  goal: Goal;
  onCompleteMilestone: (goalId: string, milestoneId: string) => void;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
}) {
  const categoryConfig = GOAL_CATEGORY_CONFIG[goal.category];

  return (
    <View style={styles.detailContainer}>
      {goal.description ? (
        <Text style={styles.detailDesc}>{goal.description}</Text>
      ) : null}

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

      {/* Milestones */}
      {goal.milestones && goal.milestones.length > 0 ? (
        <View style={styles.milestonesSection}>
          <Text style={styles.detailSectionTitle}>Milestones</Text>
          {goal.milestones.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => {
                if (!m.completed) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  onCompleteMilestone(goal.id, m.id);
                }
              }}
              style={styles.milestoneItem}
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
                  {format(parseISO(m.targetDate), 'MMM d, yyyy')}
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

function AddGoalSheet({
  visible,
  onClose,
  onAdd,
  colors,
  styles,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (goal: { title: string; description?: string; category: GoalCategory; targetDate: string }) => void;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<GoalCategory>('fitness');

  const handleSubmit = () => {
    if (!title.trim()) return;
    onAdd({
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      targetDate: format(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    });
    setTitle('');
    setDescription('');
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="New Goal">
      <View style={styles.addForm}>
        <Input
          label="Goal Title"
          value={title}
          onChangeText={setTitle}
          placeholder="What do you want to achieve?"
          autoFocus
        />
        <Input
          label="Description (optional)"
          value={description}
          onChangeText={setDescription}
          placeholder="Why is this important to you?"
          multiline
          containerStyle={{ marginTop: Spacing.md }}
        />

        <View style={styles.categorySection}>
          <Text style={styles.formLabel}>Category</Text>
          <View style={styles.categoryGrid}>
            {(Object.entries(GOAL_CATEGORY_CONFIG) as [GoalCategory, typeof GOAL_CATEGORY_CONFIG['fitness']][]).map(
              ([cat, config]) => (
                <Pressable
                  key={cat}
                  onPress={() => setCategory(cat)}
                  style={[
                    styles.categoryChip,
                    category === cat && {
                      backgroundColor: `${config.color}20`,
                      borderColor: config.color,
                    },
                  ]}
                >
                  <Ionicons name={config.icon as keyof typeof Ionicons.glyphMap} size={16} color={config.color} />
                  <Text
                    style={[
                      styles.categoryChipText,
                      category === cat && { color: config.color },
                    ]}
                  >
                    {config.label}
                  </Text>
                </Pressable>
              )
            )}
          </View>
        </View>

        <View style={styles.addFormFooter}>
          <Button title="Cancel" variant="ghost" onPress={onClose} />
          <Button title="Create Goal" onPress={handleSubmit} disabled={!title.trim()} />
        </View>
      </View>
    </BottomSheet>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  headerLeft: {
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
    color: colors.foreground,
  },
  goalDesc: {
    fontSize: FontSize.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  goalProgress: {
    gap: Spacing.xs,
  },
  goalMilestones: {
    fontSize: FontSize.xs,
    color: colors.textMuted,
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
    color: colors.textSecondary,
  },
  // Detail
  detailContainer: {
    gap: Spacing.lg,
    paddingBottom: Spacing['2xl'],
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
    color: colors.textDim,
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
  // Add form
  addForm: {
    paddingBottom: Spacing['2xl'],
  },
  formLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semibold,
    color: colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  categorySection: {
    marginTop: Spacing.lg,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLight,
  },
  categoryChipText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.medium,
    color: colors.textSecondary,
  },
  addFormFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
});
