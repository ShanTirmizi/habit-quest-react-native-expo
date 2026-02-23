import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { format, isToday, parseISO } from 'date-fns';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Colors, FontSize, Spacing, Radius } from '@/constants/theme';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/contexts/auth-context';
import type { JournalEntry, JournalMood } from '@/types';
import { MOOD_CONFIG, JOURNAL_XP } from '@/types';

const GRATITUDE_PROMPTS = [
  'What made you smile today?',
  'Who helped you recently?',
  "What's something beautiful you noticed?",
  "What's a small win you had?",
  'What are you looking forward to?',
];

export default function ChroniclesScreen() {
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();
  const [isWriting, setIsWriting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // New entry form state
  const [gratitude1, setGratitude1] = useState('');
  const [gratitude2, setGratitude2] = useState('');
  const [gratitude3, setGratitude3] = useState('');
  const [improvement, setImprovement] = useState('');
  const [content, setContent] = useState('');
  const [selectedMood, setSelectedMood] = useState<JournalMood | null>(null);
  const [saving, setSaving] = useState(false);

  // Fetch real data from Convex
  const rawEntries = useQuery(api.journal.getEntries, userId ? { userId } : 'skip');
  const addEntryMutation = useMutation(api.journal.addEntry);
  const updateEntryMutation = useMutation(api.journal.updateEntry);

  // Map Convex entries to the JournalEntry type the UI expects
  const entries: JournalEntry[] = useMemo(() => {
    if (!rawEntries) return [];
    return rawEntries.map((e) => ({
      id: e._id,
      entryType: e.entryType as JournalEntry['entryType'],
      gratitudes: e.gratitudes as [string, string, string],
      improvement: e.improvement,
      content: e.content,
      weekHighlights: e.weekHighlights,
      weekChallenges: e.weekChallenges,
      nextWeekGoals: e.nextWeekGoals,
      mood: e.mood as JournalMood | undefined,
      createdAt: new Date(e._creationTime).toISOString(),
      wordCount: e.wordCount,
      xpAwarded: e.xpAwarded,
      entryDate: e.entryDate,
      promptsUsed: e.promptsUsed,
    }));
  }, [rawEntries]);

  const todayEntry = useMemo(
    () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      return entries.find((e) => e.entryDate === today || (e.createdAt && isToday(parseISO(e.createdAt))));
    },
    [entries]
  );

  const hasEntryToday = !!todayEntry;

  const calculateXp = useCallback(() => {
    let xp = 0;
    if (gratitude1 && gratitude2 && gratitude3) xp += JOURNAL_XP.BASE;
    if (improvement) xp += JOURNAL_XP.IMPROVEMENT_BONUS;
    if (content) xp += JOURNAL_XP.THOUGHTS_BONUS;
    return Math.min(xp, JOURNAL_XP.MAX_DAILY);
  }, [gratitude1, gratitude2, gratitude3, improvement, content]);

  const handleSaveEntry = useCallback(async () => {
    if (!gratitude1 || !gratitude2 || !gratitude3 || !userId) return;

    setSaving(true);
    try {
      await addEntryMutation({
        userId,
        entryType: 'daily',
        gratitudes: [gratitude1, gratitude2, gratitude3],
        improvement: improvement || undefined,
        content: content || undefined,
        mood: selectedMood || undefined,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsWriting(false);
      setGratitude1('');
      setGratitude2('');
      setGratitude3('');
      setImprovement('');
      setContent('');
      setSelectedMood(null);
    } catch (err) {
      console.error('Failed to save entry:', err);
    } finally {
      setSaving(false);
    }
  }, [gratitude1, gratitude2, gratitude3, improvement, content, selectedMood, userId, addEntryMutation]);

  const handleUpdateEntry = useCallback(async () => {
    if (!gratitude1 || !gratitude2 || !gratitude3 || !userId || !todayEntry) return;

    setSaving(true);
    try {
      await updateEntryMutation({
        entryId: todayEntry.id as any,
        userId,
        gratitudes: [gratitude1, gratitude2, gratitude3],
        improvement: improvement || undefined,
        content: content || undefined,
        mood: selectedMood || undefined,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsEditing(false);
      setGratitude1('');
      setGratitude2('');
      setGratitude3('');
      setImprovement('');
      setContent('');
      setSelectedMood(null);
    } catch (err) {
      console.error('Failed to update entry:', err);
    } finally {
      setSaving(false);
    }
  }, [gratitude1, gratitude2, gratitude3, improvement, content, selectedMood, userId, todayEntry, updateEntryMutation]);

  const handleStartEditing = useCallback(() => {
    if (!todayEntry) return;
    setGratitude1(todayEntry.gratitudes[0] || '');
    setGratitude2(todayEntry.gratitudes[1] || '');
    setGratitude3(todayEntry.gratitudes[2] || '');
    setImprovement(todayEntry.improvement || '');
    setContent(todayEntry.content || '');
    setSelectedMood(todayEntry.mood || null);
    setIsEditing(true);
  }, [todayEntry]);

  const prompts = useMemo(() => {
    const shuffled = [...GRATITUDE_PROMPTS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }, []);

  const isLoading = rawEntries === undefined;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Chronicles</Text>
          <Text style={styles.subtitle}>
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'} · {hasEntryToday ? 'Journaled today' : 'No entry yet'}
          </Text>
        </View>
        {!isWriting && !isEditing && !hasEntryToday ? (
          <Pressable
            onPress={() => setIsWriting(true)}
            style={({ pressed }) => [styles.writeBtn, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="create-outline" size={18} color={Colors.background} />
            <Text style={styles.writeBtnText}>Write</Text>
          </Pressable>
        ) : hasEntryToday && !isWriting && !isEditing ? (
          <Pressable
            onPress={handleStartEditing}
            style={({ pressed }) => [styles.writeBtn, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="pencil-outline" size={18} color={Colors.background} />
            <Text style={styles.writeBtnText}>Edit</Text>
          </Pressable>
        ) : null}
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
          keyboardShouldPersistTaps="handled"
        >
          {/* Writing Form */}
          {isWriting || isEditing ? (
            <GlassCard style={styles.writeForm}>
              <Text style={styles.formTitle}>{isEditing ? "Edit Today's Entry" : "Today's Reflection"}</Text>

              {/* Mood Selection */}
              <View style={styles.moodSection}>
                <Text style={styles.formLabel}>How are you feeling?</Text>
                <View style={styles.moodRow}>
                  {(Object.keys(MOOD_CONFIG) as JournalMood[]).map((mood) => {
                    const config = MOOD_CONFIG[mood];
                    const isSelected = selectedMood === mood;
                    return (
                      <Pressable
                        key={mood}
                        onPress={() => setSelectedMood(mood)}
                        style={[
                          styles.moodChip,
                          isSelected && { backgroundColor: `${config.color}20`, borderColor: config.color },
                        ]}
                      >
                        <Ionicons name={config.icon as keyof typeof Ionicons.glyphMap} size={18} color={isSelected ? config.color : Colors.textMuted} />
                        <Text
                          style={[
                            styles.moodLabel,
                            isSelected && { color: config.color },
                          ]}
                        >
                          {config.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Gratitudes */}
              <View style={styles.gratitudeSection}>
                <Text style={styles.formLabel}>3 things I&apos;m grateful for</Text>
                <View style={styles.gratitudeInputs}>
                  {[
                    { value: gratitude1, setter: setGratitude1, placeholder: prompts[0] },
                    { value: gratitude2, setter: setGratitude2, placeholder: prompts[1] },
                    { value: gratitude3, setter: setGratitude3, placeholder: prompts[2] },
                  ].map((item, i) => (
                    <View key={i} style={styles.gratitudeRow}>
                      <Text style={styles.gratitudeNumber}>{i + 1}</Text>
                      <TextInput
                        style={styles.gratitudeInput}
                        value={item.value}
                        onChangeText={item.setter}
                        placeholder={item.placeholder}
                        placeholderTextColor={Colors.textDim}
                        selectionColor={Colors.primary}
                      />
                    </View>
                  ))}
                </View>
              </View>

              {/* Improvement */}
              <View style={styles.section}>
                <Text style={styles.formLabel}>How could today be better? (+{JOURNAL_XP.IMPROVEMENT_BONUS} XP)</Text>
                <TextInput
                  style={[styles.textArea, { minHeight: 60 }]}
                  value={improvement}
                  onChangeText={setImprovement}
                  placeholder="One thing I could improve..."
                  placeholderTextColor={Colors.textDim}
                  selectionColor={Colors.primary}
                  multiline
                />
              </View>

              {/* Additional Thoughts */}
              <View style={styles.section}>
                <Text style={styles.formLabel}>Additional thoughts (+{JOURNAL_XP.THOUGHTS_BONUS} XP)</Text>
                <TextInput
                  style={[styles.textArea, { minHeight: 80 }]}
                  value={content}
                  onChangeText={setContent}
                  placeholder="Free-form reflections, ideas, feelings..."
                  placeholderTextColor={Colors.textDim}
                  selectionColor={Colors.primary}
                  multiline
                />
              </View>

              {/* XP Preview */}
              <View style={styles.xpPreview}>
                <Text style={styles.xpPreviewLabel}>XP Earned</Text>
                <Text style={styles.xpPreviewValue}>+{calculateXp()} XP</Text>
              </View>

              {/* Actions */}
              <View style={styles.formActions}>
                <Button title="Cancel" variant="ghost" onPress={() => { setIsWriting(false); setIsEditing(false); }} />
                <Button
                  title={isEditing ? "Update Entry" : "Save Entry"}
                  onPress={isEditing ? handleUpdateEntry : handleSaveEntry}
                  loading={saving}
                  disabled={!gratitude1 || !gratitude2 || !gratitude3}
                />
              </View>
            </GlassCard>
          ) : null}

          {/* Mood Trend (simplified) */}
          {entries.length >= 2 ? (
            <GlassCard>
              <Text style={styles.trendTitle}>Recent Moods</Text>
              <View style={styles.moodTrend}>
                {entries.slice(0, 7).map((entry) => (
                  <View key={entry.id} style={styles.moodDot}>
                    <Ionicons
                      name={(entry.mood ? MOOD_CONFIG[entry.mood].icon : 'document-text-outline') as keyof typeof Ionicons.glyphMap}
                      size={16}
                      color={entry.mood ? MOOD_CONFIG[entry.mood].color : Colors.textDim}
                    />
                    <Text style={styles.moodDotDate}>
                      {entry.entryDate
                        ? format(parseISO(entry.entryDate), 'MMM d')
                        : format(parseISO(entry.createdAt), 'MMM d')}
                    </Text>
                  </View>
                ))}
              </View>
            </GlassCard>
          ) : null}

          {/* Entry History */}
          {entries.length === 0 && !isWriting ? (
            <EmptyState
              icon="book-outline"
              title="Your chronicles await"
              description="Start journaling to track your mood, practice gratitude, and earn XP. Writing just 3 gratitudes takes 2 minutes."
              actionLabel="Write First Entry"
              onAction={() => setIsWriting(true)}
            />
          ) : entries.length > 0 ? (
            <View style={styles.entryList}>
              <Text style={styles.sectionTitle}>Past Entries</Text>
              {entries.map((entry) => (
                <EntryCard key={entry.id} entry={entry} />
              ))}
            </View>
          ) : null}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </View>
  );
}

function EntryCard({ entry }: { entry: JournalEntry }) {
  const [expanded, setExpanded] = useState(false);
  const dateStr = entry.entryDate
    ? format(parseISO(entry.entryDate), 'EEEE, MMM d')
    : format(parseISO(entry.createdAt), 'EEEE, MMM d');

  return (
    <GlassCard onPress={() => setExpanded(!expanded)}>
      <View style={cardStyles.header}>
        <View style={cardStyles.headerLeft}>
          <Ionicons
            name={(entry.mood ? MOOD_CONFIG[entry.mood].icon : 'document-text-outline') as keyof typeof Ionicons.glyphMap}
            size={20}
            color={entry.mood ? MOOD_CONFIG[entry.mood].color : Colors.textDim}
          />
          <View>
            <Text style={cardStyles.date}>{dateStr}</Text>
            <Text style={cardStyles.meta}>
              {entry.wordCount} words · +{entry.xpAwarded} XP
            </Text>
          </View>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={Colors.textDim}
        />
      </View>

      {expanded ? (
        <View style={cardStyles.body}>
          <View style={cardStyles.gratitudes}>
            {entry.gratitudes.map((g, i) => (
              <Text key={i} style={cardStyles.gratitude}>
                {i + 1}. {g}
              </Text>
            ))}
          </View>
          {entry.improvement ? (
            <View style={cardStyles.improvementSection}>
              <Text style={cardStyles.label}>Improvement</Text>
              <Text style={cardStyles.text}>{entry.improvement}</Text>
            </View>
          ) : null}
          {entry.content ? (
            <View style={cardStyles.contentSection}>
              <Text style={cardStyles.label}>Thoughts</Text>
              <Text style={cardStyles.text}>{entry.content}</Text>
            </View>
          ) : null}
        </View>
      ) : (
        <Text style={cardStyles.preview} numberOfLines={1}>
          {entry.gratitudes[0]}
        </Text>
      )}
    </GlassCard>
  );
}

const cardStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  date: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.foreground,
  },
  meta: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  preview: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },
  body: {
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  gratitudes: {
    gap: 4,
  },
  gratitude: {
    fontSize: FontSize.sm,
    color: Colors.foreground,
    lineHeight: 20,
  },
  improvementSection: {
    gap: 4,
  },
  contentSection: {
    gap: 4,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  text: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});

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
  writeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  writeBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.background,
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
  writeForm: {
    gap: Spacing.lg,
  },
  formTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.foreground,
  },
  formLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  moodSection: {},
  moodRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  moodChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceLight,
    gap: 4,
  },
  moodLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  gratitudeSection: {},
  gratitudeInputs: {
    gap: Spacing.sm,
  },
  gratitudeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  gratitudeNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primaryBg,
    textAlign: 'center',
    lineHeight: 24,
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primary,
  },
  gratitudeInput: {
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
  section: {},
  textArea: {
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.sm,
    color: Colors.foreground,
    textAlignVertical: 'top',
  },
  xpPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.primaryBg,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  xpPreviewLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  xpPreviewValue: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.primary,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
  },
  trendTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  moodTrend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  moodDot: {
    alignItems: 'center',
    gap: 4,
  },
  moodDotDate: {
    fontSize: 10,
    color: Colors.textDim,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  entryList: {
    gap: Spacing.sm,
  },
});
