import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { Colors, FontSize, Spacing, Radius } from '@/constants/theme';
import { CATEGORY_COLORS } from '@/constants/theme';
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
  const [noteText, setNoteText] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);

  if (!habit) return null;

  const categoryColor = CATEGORY_COLORS[habit.category] || Colors.textSecondary;
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
          <BadgePill label={`+${habit.xpReward} XP`} color={Colors.primary} />
          <BadgePill label={freqLabel} color={Colors.textSecondary} />
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>🔥</Text>
            <Text style={styles.statValue}>{habit.streak}</Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>📊</Text>
            <Text style={styles.statValue}>{habit.completedDates.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>⚡</Text>
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

        {/* Rationale */}
        {habit.rationale ? (
          <View style={styles.rationaleSection}>
            <Text style={styles.sectionTitle}>Why It Works</Text>
            <Text style={styles.rationaleText}>{habit.rationale}</Text>
            {habit.citation ? (
              <Text style={styles.citationText}>
                — {habit.citation.author} ({habit.citation.year})
              </Text>
            ) : null}
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
                color={Colors.primary}
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
                placeholderTextColor={Colors.textDim}
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

const styles = StyleSheet.create({
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
    backgroundColor: Colors.surfaceLight,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: 2,
  },
  statEmoji: {
    fontSize: 20,
  },
  statValue: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.foreground,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  intentionSection: {
    gap: 4,
  },
  intentionText: {
    fontSize: FontSize.sm,
    color: Colors.foreground,
  },
  intentionLabel: {
    fontWeight: '700',
    color: Colors.primary,
  },
  rationaleSection: {
    gap: 4,
  },
  rationaleText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  citationText: {
    fontSize: FontSize.xs,
    color: Colors.textDim,
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
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.sm,
    color: Colors.foreground,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  notesList: {
    gap: Spacing.sm,
  },
  noteCard: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: 4,
  },
  noteDate: {
    fontSize: FontSize.xs,
    color: Colors.textDim,
  },
  noteContent: {
    fontSize: FontSize.sm,
    color: Colors.foreground,
    lineHeight: 18,
  },
  noNotes: {
    fontSize: FontSize.sm,
    color: Colors.textDim,
    fontStyle: 'italic',
  },
  actions: {
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
});
