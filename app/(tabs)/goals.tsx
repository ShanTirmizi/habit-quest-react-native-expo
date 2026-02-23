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
import { Colors, FontSize, Spacing, Radius } from '@/constants/theme';
import { GlassCard } from '@/components/ui/GlassCard';
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
          <Skeleton height={140} borderRadius={Radius.lg} />
          <Skeleton height={140} borderRadius={Radius.lg} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Goals</Text>
          <Text style={styles.subtitle}>
            {activeCount} active · {achievedCount} achieved
          </Text>
        </View>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowAddSheet(true);
          }}
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="add" size={22} color={Colors.primary} />
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
            tintColor={Colors.primary}
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
          />
        ) : null}
      </BottomSheet>
    </View>
  );
}

function GoalCard({ goal, onPress }: { goal: Goal; onPress: () => void }) {
  const categoryConfig = GOAL_CATEGORY_CONFIG[goal.category];
  const statusConfig = GOAL_STATUS_CONFIG[goal.status];
  const daysRemaining = differenceInDays(parseISO(goal.targetDate), new Date());
  const completedMilestones = goal.milestones?.filter((m) => m.completed).length || 0;
  const totalMilestones = goal.milestones?.length || 0;
  const progress = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;

  return (
    <GlassCard onPress={onPress} style={styles.goalCard}>
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
          daysRemaining < 14 && { color: Colors.warning },
          daysRemaining < 0 && { color: Colors.danger },
        ]}>
          {daysRemaining > 0 ? `${daysRemaining}d left` : daysRemaining === 0 ? 'Today!' : 'Overdue'}
        </Text>
      </View>
    </GlassCard>
  );
}

function GoalDetail({
  goal,
  onCompleteMilestone,
}: {
  goal: Goal;
  onCompleteMilestone: (goalId: string, milestoneId: string) => void;
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
                  <Ionicons name="checkmark" size={12} color={Colors.background} />
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
                  ci.status === 'on_track' ? Colors.success :
                  ci.status === 'ahead' ? Colors.info :
                  ci.status === 'struggling' ? Colors.warning :
                  Colors.textMuted
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
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (goal: { title: string; description?: string; category: GoalCategory; targetDate: string }) => void;
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  title: {
    fontSize: FontSize['2xl'],
    fontWeight: '800',
    color: Colors.foreground,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
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
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceLight,
  },
  filterChipActive: {
    backgroundColor: Colors.primaryBg,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    color: Colors.textMuted,
  },
  filterChipTextActive: {
    color: Colors.primary,
    fontWeight: '600',
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
    fontWeight: '700',
    color: Colors.foreground,
  },
  goalDesc: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  goalProgress: {
    gap: Spacing.xs,
  },
  goalMilestones: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  goalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  goalDays: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  // Detail
  detailContainer: {
    gap: Spacing.lg,
    paddingBottom: Spacing['2xl'],
  },
  detailDesc: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
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
    color: Colors.textMuted,
  },
  detailMetaValue: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.foreground,
  },
  detailSectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textSecondary,
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
    borderBottomColor: Colors.glassBorder,
  },
  milestoneCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneCheckDone: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  milestoneTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.foreground,
  },
  milestoneTitleDone: {
    textDecorationLine: 'line-through',
    color: Colors.textMuted,
  },
  milestoneDate: {
    fontSize: FontSize.xs,
    color: Colors.textDim,
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
    fontWeight: '600',
    color: Colors.textSecondary,
    width: 50,
  },
  checkInNote: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    flex: 1,
  },
  // Add form
  addForm: {
    paddingBottom: Spacing['2xl'],
  },
  formLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
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
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceLight,
  },
  categoryChipText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  addFormFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
});
