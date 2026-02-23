import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { format, differenceInDays, parseISO } from 'date-fns';
import { Colors, FontSize, Spacing, Radius } from '@/constants/theme';
import { GlassCard } from '@/components/ui/GlassCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { BadgePill } from '@/components/ui/BadgePill';
import { EmptyState } from '@/components/ui/EmptyState';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { Goal, GoalCategory, GoalStatus } from '@/types';
import { GOAL_CATEGORY_CONFIG, GOAL_STATUS_CONFIG } from '@/types';

const DEMO_GOALS: Goal[] = [
  {
    id: '1',
    userId: 'demo',
    title: 'Run a half marathon',
    description: 'Train consistently to complete a half marathon by June',
    category: 'fitness',
    targetDate: '2024-06-15',
    status: 'active',
    currentLevel: 'intermediate',
    linkedHabitIds: ['1'],
    milestones: [
      { id: 'm1', title: 'Run 5K without stopping', targetDate: '2024-03-01', completed: true, completedAt: '2024-02-28' },
      { id: 'm2', title: 'Run 10K', targetDate: '2024-04-01', completed: false },
      { id: 'm3', title: 'Run 15K', targetDate: '2024-05-01', completed: false },
    ],
    checkIns: [
      { date: '2024-02-01', status: 'on_track', note: 'Feeling strong!' },
    ],
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    userId: 'demo',
    title: 'Learn TypeScript Advanced Patterns',
    description: 'Master generics, conditional types, and utility types',
    category: 'learning',
    targetDate: '2024-04-30',
    status: 'active',
    currentLevel: 'intermediate',
    milestones: [
      { id: 'm1', title: 'Complete generics chapter', targetDate: '2024-02-15', completed: true, completedAt: '2024-02-14' },
      { id: 'm2', title: 'Build a typed state machine', targetDate: '2024-03-15', completed: false },
    ],
    createdAt: '2024-01-15T00:00:00Z',
  },
  {
    id: '3',
    userId: 'demo',
    title: 'Save $5,000 emergency fund',
    category: 'financial',
    targetDate: '2024-12-31',
    status: 'active',
    createdAt: '2024-01-01T00:00:00Z',
  },
];

type FilterValue = 'all' | GoalStatus;

export default function GoalsScreen() {
  const insets = useSafeAreaInsets();
  const [goals, setGoals] = useState<Goal[]>(DEMO_GOALS);
  const [filter, setFilter] = useState<FilterValue>('all');
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  const filteredGoals = useMemo(() => {
    if (filter === 'all') return goals;
    return goals.filter((g) => g.status === filter);
  }, [goals, filter]);

  const activeCount = goals.filter((g) => g.status === 'active').length;
  const achievedCount = goals.filter((g) => g.status === 'achieved').length;

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
        onAdd={(goalData) => {
          setGoals((prev) => [
            ...prev,
            {
              ...goalData,
              id: Date.now().toString(),
              userId: 'demo',
              status: 'active' as GoalStatus,
              createdAt: new Date().toISOString(),
            },
          ]);
        }}
      />

      {/* Goal Detail */}
      <BottomSheet
        visible={!!selectedGoal}
        onClose={() => setSelectedGoal(null)}
        title={selectedGoal?.title}
      >
        {selectedGoal ? <GoalDetail goal={selectedGoal} /> : null}
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

function GoalDetail({ goal }: { goal: Goal }) {
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
            <View key={m.id} style={styles.milestoneItem}>
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
            </View>
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
