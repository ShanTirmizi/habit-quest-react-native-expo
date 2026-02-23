import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useAuth } from '@/contexts/auth-context';
import { Colors, FontSize, Spacing, Radius } from '@/constants/theme';
import { GlassCard } from '@/components/ui/GlassCard';
import { BadgePill } from '@/components/ui/BadgePill';
import { EmptyState } from '@/components/ui/EmptyState';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { SideQuest, QuestPriority } from '@/types';
import { QUEST_PRIORITY_CONFIG } from '@/types';

export default function QuestsScreen() {
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();
  const [showAddSheet, setShowAddSheet] = useState(false);

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
    (id: string) => {
      if (!userId) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      completeQuestMutation({ questId: id as any, userId });
    },
    [userId, completeQuestMutation]
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (!userId) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      deleteQuestMutation({ questId: id as any, userId });
    },
    [userId, deleteQuestMutation]
  );

  const handleUncomplete = useCallback(
    (id: string) => {
      if (!userId) return;
      uncompleteQuestMutation({ questId: id as any, userId });
    },
    [userId, uncompleteQuestMutation]
  );

  const handleAdd = useCallback(
    (quest: { title: string; description?: string; priority: QuestPriority }) => {
      if (!userId) return;
      const xp = QUEST_PRIORITY_CONFIG[quest.priority].xp;
      addQuestMutation({
        userId,
        title: quest.title,
        description: quest.description,
        xpReward: xp,
        priority: quest.priority,
        questType: 'ongoing',
      });
    },
    [userId, addQuestMutation]
  );

  const isLoading = rawQuests === undefined;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Side Quests</Text>
          <Text style={styles.subtitle}>
            {pendingQuests.length} active · {completedQuests.length} completed
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

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
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
              {pendingQuests.length > 0 ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Active Quests</Text>
                  <View style={styles.questList}>
                    {pendingQuests.map((quest) => (
                      <QuestCard
                        key={quest.id}
                        quest={quest}
                        onComplete={handleComplete}
                        onDelete={handleDelete}
                      />
                    ))}
                  </View>
                </View>
              ) : null}

              {completedQuests.length > 0 ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Completed</Text>
                  <View style={styles.questList}>
                    {completedQuests.map((quest) => (
                      <QuestCard
                        key={quest.id}
                        quest={quest}
                        onUncomplete={handleUncomplete}
                        onDelete={handleDelete}
                      />
                    ))}
                  </View>
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
      />
    </View>
  );
}

function QuestCard({
  quest,
  onComplete,
  onUncomplete,
  onDelete,
}: {
  quest: SideQuest;
  onComplete?: (id: string) => void;
  onUncomplete?: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const priorityConfig = QUEST_PRIORITY_CONFIG[quest.priority];

  return (
    <GlassCard style={styles.questCard}>
      <View style={styles.questContent}>
        <View style={styles.questTop}>
          <Text style={[styles.questTitle, quest.completed && styles.questTitleDone]}>
            {quest.title}
          </Text>
          <Pressable onPress={() => onDelete(quest.id)} hitSlop={8}>
            <Ionicons name="trash-outline" size={16} color={Colors.textDim} />
          </Pressable>
        </View>
        {quest.description ? (
          <Text style={styles.questDesc} numberOfLines={2}>
            {quest.description}
          </Text>
        ) : null}
        <View style={styles.questMeta}>
          <BadgePill
            label={priorityConfig.label}
            color={priorityConfig.color}
            size="sm"
          />
          <Text style={styles.questXp}>+{quest.xpReward} XP</Text>
        </View>
      </View>
      {!quest.completed && onComplete ? (
        <Pressable
          onPress={() => onComplete(quest.id)}
          style={({ pressed }) => [styles.completeBtn, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="checkmark" size={20} color={Colors.background} />
        </Pressable>
      ) : quest.completed && onUncomplete ? (
        <Pressable
          onPress={() => onUncomplete(quest.id)}
          style={({ pressed }) => [styles.undoBtn, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="arrow-undo" size={16} color={Colors.textMuted} />
        </Pressable>
      ) : null}
    </GlassCard>
  );
}

function AddQuestSheet({
  visible,
  onClose,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (quest: { title: string; description?: string; priority: QuestPriority }) => void;
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
          autoFocus
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.xs,
  },
  questList: {
    gap: Spacing.sm,
  },
  questCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  questContent: {
    flex: 1,
    gap: 4,
  },
  questTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  questTitle: {
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.foreground,
    flex: 1,
    marginRight: Spacing.sm,
  },
  questTitleDone: {
    textDecorationLine: 'line-through',
    color: Colors.textMuted,
  },
  questDesc: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  questMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: 4,
  },
  questXp: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: '600',
  },
  completeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  undoBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addForm: {
    paddingBottom: Spacing['2xl'],
  },
  prioritySection: {
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  priorityLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
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
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
  },
  priorityChipText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  addFormFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
});
