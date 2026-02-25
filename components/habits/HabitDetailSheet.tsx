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
import type { Habit } from '@/types';
import { FREQUENCY_LABELS } from '@/types';

interface HabitDetailSheetProps {
  habit: Habit | null;
  isCompleted: boolean;
  onClose: () => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAddNote: (habitId: string, text: string) => void;
}

export function HabitDetailSheet({
  habit,
  isCompleted,
  onClose,
  onToggle,
  onDelete,
  onAddNote,
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

        {/* Implementation Intentions */}
        {(habit.location || habit.trigger) ? (
          <View style={styles.intentionSection}>
            <Text style={styles.sectionTitle}>Implementation Intention</Text>
            {habit.trigger ? (
              <Text style={styles.intentionText}>
                <Text style={styles.intentionLabel}>After: </Text>
                {habit.trigger}
              </Text>
            ) : null}
            {habit.location ? (
              <Text style={styles.intentionText}>
                <Text style={styles.intentionLabel}>At: </Text>
                {habit.location}
              </Text>
            ) : null}
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
          <Button
            title="Delete Habit"
            onPress={handleDelete}
            variant="danger"
            fullWidth
          />
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
  intentionSection: {
    gap: 4,
  },
  intentionText: {
    fontSize: FontSize.sm,
    color: colors.foreground,
  },
  intentionLabel: {
    fontFamily: FontFamily.bold,
    color: colors.primary,
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
});
