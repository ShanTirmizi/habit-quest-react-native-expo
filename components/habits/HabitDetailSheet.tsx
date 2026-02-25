import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { FontSize, Spacing, Radius, FontFamily, getCategoryColors, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { BadgePill } from '@/components/ui/BadgePill';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { AutomaticityArc } from './AutomaticityArc';
import type { Habit } from '@/types';
import type { AutomaticityInfo } from '@/lib/automaticity';
import { FREQUENCY_LABELS } from '@/types';

interface HabitDetailSheetProps {
  habit: Habit | null;
  isCompleted: boolean;
  onClose: () => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAddNote: (habitId: string, text: string) => void;
  automaticityInfo?: AutomaticityInfo | null;
  streakFreezes?: number;
  onHibernate?: (id: string) => void;
  onWake?: (id: string) => void;
  onUseStreakFreeze?: () => void;
}

export function HabitDetailSheet({
  habit,
  isCompleted,
  onClose,
  onToggle,
  onDelete,
  onAddNote,
  automaticityInfo,
  streakFreezes,
  onHibernate,
  onWake,
  onUseStreakFreeze,
}: HabitDetailSheetProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const categoryColors = useMemo(() => getCategoryColors(colors), [colors]);
  const [noteText, setNoteText] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);

  if (!habit) return null;

  const categoryColor = categoryColors[habit.category] || colors.textSecondary;
  const freqLabel = habit.frequency?.type
    ? FREQUENCY_LABELS[habit.frequency.type]
    : 'Every day';

  const handleDelete = () => {
    Alert.alert(
      'Delete Habit',
      `Are you sure you want to delete "${habit.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDelete(habit.id);
            onClose();
          },
        },
      ]
    );
  };

  const handleSaveNote = () => {
    if (!noteText.trim()) return;
    onAddNote(habit.id, noteText.trim());
    setNoteText('');
    setShowNoteInput(false);
  };

  return (
    <BottomSheet visible={!!habit} onClose={onClose} title={habit.name}>
      <View style={styles.container}>
        {/* Meta */}
        <View style={styles.metaRow}>
          <BadgePill
            label={habit.category.charAt(0).toUpperCase() + habit.category.slice(1)}
            color={categoryColor}
          />
          <BadgePill label={`+${habit.xpReward} XP`} color={colors.primary} />
          <BadgePill label={freqLabel} color={colors.textSecondary} />
          {habit.goalId ? (
            <View style={styles.aiBadge}>
              <Ionicons name="sparkles" size={12} color={colors.secondary} />
              <Text style={styles.aiBadgeText}>AI-Generated</Text>
            </View>
          ) : null}
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="flame" size={20} color={colors.accent} />
            <Text style={styles.statValue}>{habit.streak}</Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="bar-chart" size={20} color={colors.info} />
            <Text style={styles.statValue}>{habit.completedDates.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="flash" size={20} color={colors.primary} />
            <Text style={styles.statValue}>
              {habit.completedDates.length * habit.xpReward}
            </Text>
            <Text style={styles.statLabel}>XP Earned</Text>
          </View>
        </View>

        {/* Automaticity Meter */}
        {automaticityInfo && automaticityInfo.score > 0 ? (
          <View style={styles.automaticitySection}>
            <View style={styles.automaticitySectionHeader}>
              <Text style={styles.sectionTitle}>Automaticity</Text>
              <BadgePill
                label={automaticityInfo.phaseLabel}
                color={
                  automaticityInfo.phase === 'automatic' ? '#FFD700' :
                  automaticityInfo.phase === 'strengthening' ? colors.success :
                  automaticityInfo.phase === 'building' ? colors.primary :
                  colors.textMuted
                }
                size="sm"
              />
            </View>
            <View style={styles.automaticityCard}>
              <View style={styles.automaticityTop}>
                <AutomaticityArc score={automaticityInfo.score} size={52} />
                <View style={styles.automaticityStats}>
                  <Text style={styles.automaticityScore}>{automaticityInfo.score}%</Text>
                  <Text style={styles.automaticityHint}>
                    {automaticityInfo.phase === 'automatic'
                      ? 'This habit is locked in!'
                      : `~${automaticityInfo.daysToLockIn} days to lock-in`}
                  </Text>
                </View>
              </View>
              <ProgressBar
                progress={automaticityInfo.score}
                color={
                  automaticityInfo.score >= 95 ? '#FFD700' :
                  automaticityInfo.score >= 60 ? colors.success :
                  colors.primary
                }
                height={4}
              />
              <Text style={styles.automaticityDetail}>
                {automaticityInfo.totalCompletions} completions over {automaticityInfo.daysSinceStart} days ({Math.round(automaticityInfo.completionRate * 100)}% consistency)
              </Text>
            </View>
          </View>
        ) : null}

        {/* Temptation Bundle */}
        {habit.rewardBundle ? (
          <View style={styles.bundleCard}>
            <View style={styles.bundleHeader}>
              <Ionicons name="gift-outline" size={16} color={colors.accent} />
              <Text style={styles.bundleTitleText}>Reward Bundle</Text>
            </View>
            <Text style={styles.bundleReward}>{habit.rewardBundle}</Text>
          </View>
        ) : null}

        {/* If-Then Blueprint */}
        {(habit.location || habit.trigger) ? (
          <View style={styles.intentionSection}>
            <Text style={styles.sectionTitle}>If-Then Blueprint</Text>
            <View style={styles.blueprintCard}>
              {habit.trigger ? (
                <View style={styles.blueprintRow}>
                  <Text style={styles.blueprintKeyword}>IF</Text>
                  <Text style={styles.blueprintText}>{habit.trigger}</Text>
                </View>
              ) : null}
              <View style={styles.blueprintRow}>
                <Text style={[styles.blueprintKeyword, { color: colors.success }]}>THEN</Text>
                <Text style={styles.blueprintText}>{habit.name}</Text>
              </View>
              {habit.location ? (
                <View style={styles.blueprintRow}>
                  <Text style={[styles.blueprintKeyword, { color: colors.info }]}>AT</Text>
                  <Text style={styles.blueprintText}>{habit.location}</Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Research / Rationale */}
        {habit.rationale ? (
          <View style={styles.rationaleSection}>
            <View style={styles.rationaleTitleRow}>
              <Ionicons name="bulb-outline" size={16} color={colors.secondary} />
              <Text style={styles.sectionTitle}>Why This Habit Works</Text>
            </View>
            <View style={styles.rationaleCard}>
              <Text style={styles.rationaleText}>{habit.rationale}</Text>
              {habit.citation ? (
                <View style={styles.citationCard}>
                  <View style={styles.citationHeader}>
                    <Ionicons name="book-outline" size={13} color={colors.textMuted} />
                    <Text style={styles.citationSource}>
                      {habit.citation.author} ({habit.citation.year})
                    </Text>
                  </View>
                  <Text style={styles.citationFinding}>{habit.citation.finding}</Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Notes */}
        <View style={styles.notesSection}>
          <View style={styles.notesHeader}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Pressable onPress={() => setShowNoteInput(!showNoteInput)}>
              <Ionicons
                name={showNoteInput ? 'close' : 'add-circle-outline'}
                size={20}
                color={colors.primary}
              />
            </Pressable>
          </View>

          {showNoteInput ? (
            <View style={styles.noteInput}>
              <TextInput
                style={styles.noteTextInput}
                value={noteText}
                onChangeText={setNoteText}
                placeholder="Add a note..."
                placeholderTextColor={colors.textMuted}
                multiline
                autoFocus
              />
              <Button title="Save" size="sm" onPress={handleSaveNote} disabled={!noteText.trim()} />
            </View>
          ) : null}

          {habit.notes && habit.notes.length > 0 ? (
            <View style={styles.notesList}>
              {habit.notes.map((note) => (
                <View key={note.id} style={styles.noteCard}>
                  <Text style={styles.noteDate}>
                    {format(parseISO(note.createdAt), 'MMM d, h:mm a')}
                  </Text>
                  <Text style={styles.noteContent}>{note.text}</Text>
                </View>
              ))}
            </View>
          ) : !showNoteInput ? (
            <Text style={styles.noNotes}>No notes yet</Text>
          ) : null}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title={isCompleted ? 'Mark Incomplete' : 'Complete'}
            onPress={() => onToggle(habit.id)}
            variant={isCompleted ? 'secondary' : 'primary'}
            fullWidth
          />

          {/* Streak freeze — show when streak is at risk */}
          {streakFreezes != null && streakFreezes > 0 && habit.streak > 0 && !isCompleted && onUseStreakFreeze ? (
            <Pressable
              onPress={onUseStreakFreeze}
              style={styles.freezeButton}
            >
              <Ionicons name="snow-outline" size={16} color={colors.info} />
              <Text style={styles.freezeButtonText}>
                Use Streak Freeze ({streakFreezes} left)
              </Text>
            </Pressable>
          ) : null}

          <View style={styles.actionRow}>
            {/* Hibernate / Wake */}
            {habit.hibernatedAt && onWake ? (
              <Pressable
                onPress={() => { onWake(habit.id); onClose(); }}
                style={styles.secondaryAction}
              >
                <Ionicons name="sunny-outline" size={16} color={colors.success} />
                <Text style={[styles.secondaryActionText, { color: colors.success }]}>Wake Up</Text>
              </Pressable>
            ) : !habit.hibernatedAt && onHibernate ? (
              <Pressable
                onPress={() => { onHibernate(habit.id); onClose(); }}
                style={styles.secondaryAction}
              >
                <Ionicons name="snow-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.secondaryActionText}>Hibernate</Text>
              </Pressable>
            ) : null}

            {/* Delete */}
            <Pressable onPress={handleDelete} style={styles.secondaryAction}>
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
              <Text style={[styles.secondaryActionText, { color: colors.danger }]}>Delete</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </BottomSheet>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    gap: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: 2,
  },
  statValue: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.extrabold,
    color: colors.foreground,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: colors.textMuted,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  // Automaticity
  automaticitySection: {
    gap: Spacing.xs,
  },
  automaticitySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  automaticityCard: {
    backgroundColor: colors.surfaceLight,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  automaticityTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  automaticityStats: {
    flex: 1,
    gap: 2,
  },
  automaticityScore: {
    fontSize: FontSize['2xl'],
    fontFamily: FontFamily.extrabold,
    color: colors.foreground,
  },
  automaticityHint: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.medium,
    color: colors.textSecondary,
  },
  automaticityDetail: {
    fontSize: FontSize.xs,
    color: colors.textMuted,
  },

  // Temptation Bundle
  bundleCard: {
    backgroundColor: `${colors.accent}10`,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: `${colors.accent}30`,
  },
  bundleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  bundleTitleText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold,
    color: colors.accent,
  },
  bundleReward: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.medium,
    color: colors.foreground,
    marginLeft: 24,
  },

  // If-Then Blueprint
  intentionSection: {
    gap: Spacing.xs,
  },
  blueprintCard: {
    backgroundColor: colors.surfaceLight,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  blueprintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  blueprintKeyword: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.extrabold,
    color: colors.primary,
    width: 38,
    letterSpacing: 0.5,
  },
  blueprintText: {
    flex: 1,
    fontSize: FontSize.sm,
    fontFamily: FontFamily.medium,
    color: colors.foreground,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.secondaryBg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: colors.secondaryGlow,
  },
  aiBadgeText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semibold,
    color: colors.secondary,
  },
  rationaleSection: {
    gap: Spacing.xs,
  },
  rationaleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 2,
  },
  rationaleCard: {
    backgroundColor: colors.surfaceLight,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rationaleText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  citationCard: {
    backgroundColor: colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    gap: 4,
    borderLeftWidth: 3,
    borderLeftColor: colors.secondary,
  },
  citationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  citationSource: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semibold,
    color: colors.textMuted,
  },
  citationFinding: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.regular,
    color: colors.textSecondary,
    lineHeight: 16,
    marginLeft: 19, // Align with text after icon
  },
  notesSection: {},
  notesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  noteInput: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-end',
    marginBottom: Spacing.sm,
  },
  noteTextInput: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.sm,
    color: colors.foreground,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  notesList: {
    gap: Spacing.sm,
  },
  noteCard: {
    backgroundColor: colors.surfaceLight,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: 4,
  },
  noteDate: {
    fontSize: FontSize.xs,
    color: colors.textMuted,
  },
  noteContent: {
    fontSize: FontSize.sm,
    color: colors.foreground,
    lineHeight: 18,
  },
  noNotes: {
    fontSize: FontSize.sm,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  actions: {
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  freezeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: `${colors.info}40`,
    backgroundColor: `${colors.info}10`,
  },
  freezeButtonText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semibold,
    color: colors.info,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xl,
    marginTop: Spacing.xs,
  },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: Spacing.xs,
  },
  secondaryActionText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.medium,
    color: colors.textSecondary,
  },
});
