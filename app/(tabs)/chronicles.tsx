import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { format, isToday, parseISO } from 'date-fns';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Colors, FontSize, Spacing, Radius, FontFamily, Shadows } from '@/constants/theme';
import { GradientCard } from '@/components/ui/GradientCard';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
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
  const { showToast } = useToast();
  const [isWriting, setIsWriting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);

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

  const pastEntries = useMemo(
    () => entries.filter((e) => e !== todayEntry),
    [entries, todayEntry]
  );

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
      showToast('Failed to save entry', undefined, 'error');
    } finally {
      setSaving(false);
    }
  }, [gratitude1, gratitude2, gratitude3, improvement, content, selectedMood, userId, addEntryMutation]);

  const handleUpdateEntry = useCallback(async () => {
    if (!gratitude1 || !gratitude2 || !gratitude3 || !userId || !editingEntry) return;

    setSaving(true);
    try {
      await updateEntryMutation({
        entryId: editingEntry.id as any,
        userId,
        gratitudes: [gratitude1, gratitude2, gratitude3],
        improvement: improvement || undefined,
        content: content || undefined,
        mood: selectedMood || undefined,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsEditing(false);
      setEditingEntry(null);
      setGratitude1('');
      setGratitude2('');
      setGratitude3('');
      setImprovement('');
      setContent('');
      setSelectedMood(null);
    } catch (err) {
      showToast('Failed to update entry', undefined, 'error');
    } finally {
      setSaving(false);
    }
  }, [gratitude1, gratitude2, gratitude3, improvement, content, selectedMood, userId, editingEntry, updateEntryMutation]);

  const handleStartEditing = useCallback((entry: JournalEntry) => {
    setGratitude1(entry.gratitudes[0] || '');
    setGratitude2(entry.gratitudes[1] || '');
    setGratitude3(entry.gratitudes[2] || '');
    setImprovement(entry.improvement || '');
    setContent(entry.content || '');
    setSelectedMood(entry.mood || null);
    setEditingEntry(entry);
    setIsEditing(true);
  }, []);

  const prompts = useMemo(() => {
    const shuffled = [...GRATITUDE_PROMPTS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }, []);

  const isLoading = rawEntries === undefined;

  const todayMoodColor = todayEntry?.mood
    ? MOOD_CONFIG[todayEntry.mood].color
    : Colors.textMuted;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Chronicle</Text>
          <Text style={styles.subtitle}>
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'} · {hasEntryToday ? 'Journaled today' : 'No entry yet'}
          </Text>
        </View>
        {!isWriting && !isEditing ? (
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => setIsWriting(true)}
              style={({ pressed }) => [styles.writeBtn, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="create-outline" size={20} color={Colors.background} />
            </Pressable>
          </View>
        ) : null}
      </View>

      {isLoading ? (
        <View style={[styles.loadingContainer, { gap: Spacing.sm, paddingHorizontal: Spacing.lg }]}>
          <Skeleton height={160} borderRadius={Radius.xl} />
          <Skeleton height={80} borderRadius={Radius.xl} />
          <Skeleton height={80} borderRadius={Radius.xl} />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Today's Featured Card ── */}
          {todayEntry && !isWriting && !isEditing ? (
            <GradientCard
              gradient={[todayMoodColor + '15', 'transparent']}
              elevated
              onPress={() => handleStartEditing(todayEntry)}
              style={styles.featuredCard}
            >
              <View style={styles.featuredTop}>
                <View style={styles.featuredMoodRow}>
                  <Ionicons
                    name={
                      (todayEntry.mood
                        ? MOOD_CONFIG[todayEntry.mood].icon
                        : 'document-text-outline') as keyof typeof Ionicons.glyphMap
                    }
                    size={32}
                    color={todayMoodColor}
                  />
                  <View style={{ marginLeft: Spacing.sm }}>
                    <Text style={styles.featuredLabel}>Today</Text>
                    <Text style={[styles.featuredMoodText, { color: todayMoodColor }]}>
                      {todayEntry.mood ? MOOD_CONFIG[todayEntry.mood].label : 'Reflected'}
                    </Text>
                  </View>
                </View>
                <Ionicons name="pencil-outline" size={16} color={Colors.textMuted} />
              </View>

              <View style={styles.featuredGratitudes}>
                {todayEntry.gratitudes.map((g, i) => (
                  <View key={i} style={styles.featuredGratitudeRow}>
                    <View style={[styles.featuredGratitudeCircle, { backgroundColor: todayMoodColor + '30' }]}>
                      <Text style={[styles.featuredGratitudeNum, { color: todayMoodColor }]}>
                        {i + 1}
                      </Text>
                    </View>
                    <Text style={styles.featuredGratitudeText} numberOfLines={1}>
                      {g}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.featuredFooter}>
                <Text style={styles.featuredFooterText}>
                  {todayEntry.wordCount} words
                </Text>
                <View style={styles.featuredFooterRight}>
                  <Text style={styles.tapToEditText}>Tap to edit</Text>
                  <View style={styles.featuredXpBadge}>
                    <Ionicons name="flash" size={12} color={Colors.accent} />
                    <Text style={styles.featuredXpText}>+{todayEntry.xpAwarded} XP</Text>
                  </View>
                </View>
              </View>
            </GradientCard>
          ) : null}

          {/* ── Past Entries: Horizontal Gallery ── */}
          {pastEntries.length > 0 && !isWriting && !isEditing ? (
            <View style={styles.pastSection}>
              <Text style={styles.pastSectionTitle}>Past Entries</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.pastGallery}
              >
                {pastEntries.map((entry) => (
                  <PastEntryCard key={entry.id} entry={entry} onEdit={handleStartEditing} />
                ))}
              </ScrollView>
            </View>
          ) : null}

          {/* ── Empty State ── */}
          {entries.length === 0 && !isWriting ? (
            <EmptyState
              icon="book-outline"
              title="Your chronicles await"
              description="Start journaling to track your mood, practice gratitude, and earn XP. Writing just 3 gratitudes takes 2 minutes."
              actionLabel="Write First Entry"
              onAction={() => setIsWriting(true)}
            />
          ) : null}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* ── Writing / Editing BottomSheet ── */}
      <BottomSheet
        visible={isWriting || isEditing}
        onClose={() => { setIsWriting(false); setIsEditing(false); setEditingEntry(null); }}
        title={isEditing && editingEntry
          ? `Edit ${editingEntry.entryDate ? format(parseISO(editingEntry.entryDate), 'MMM d') : "Today's"} Entry`
          : "Today's Reflection"}
      >
        <View style={styles.writeForm}>
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
                    style={[styles.moodCircleOuter]}
                  >
                    <View
                      style={[
                        styles.moodCircle,
                        isSelected && {
                          backgroundColor: `${config.color}25`,
                          borderColor: config.color,
                          borderWidth: 2,
                        },
                      ]}
                    >
                      <Ionicons
                        name={config.icon as keyof typeof Ionicons.glyphMap}
                        size={24}
                        color={isSelected ? config.color : Colors.textMuted}
                      />
                    </View>
                    <Text
                      style={[
                        styles.moodCircleLabel,
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
                  <View style={styles.gratitudeNumberCircle}>
                    <Text style={styles.gratitudeNumberText}>{i + 1}</Text>
                  </View>
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
            <Text style={styles.formLabel}>
              How could today be better? (+{JOURNAL_XP.IMPROVEMENT_BONUS} XP)
            </Text>
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
            <Text style={styles.formLabel}>
              Additional thoughts (+{JOURNAL_XP.THOUGHTS_BONUS} XP)
            </Text>
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
            <Pressable
              onPress={() => { setIsWriting(false); setIsEditing(false); setEditingEntry(null); }}
              style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={isEditing ? handleUpdateEntry : handleSaveEntry}
              disabled={!gratitude1 || !gratitude2 || !gratitude3 || saving}
              style={({ pressed }) => [
                styles.saveBtn,
                (!gratitude1 || !gratitude2 || !gratitude3) && { opacity: 0.5 },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={styles.saveBtnText}>
                {saving ? 'Saving...' : isEditing ? 'Update Entry' : 'Save Entry'}
              </Text>
            </Pressable>
          </View>
        </View>
      </BottomSheet>
    </View>
  );
}

/* ── Past Entry Gallery Card ── */
function PastEntryCard({ entry, onEdit }: { entry: JournalEntry; onEdit: (entry: JournalEntry) => void }) {
  const [expanded, setExpanded] = useState(false);

  const dateStr = entry.entryDate
    ? format(parseISO(entry.entryDate), 'MMM d')
    : format(parseISO(entry.createdAt), 'MMM d');

  const moodColor = entry.mood ? MOOD_CONFIG[entry.mood].color : Colors.textMuted;
  const moodIcon = entry.mood
    ? MOOD_CONFIG[entry.mood].icon
    : 'document-text-outline';

  if (expanded) {
    return (
      <GradientCard
        gradient={[moodColor + '15', 'transparent']}
        onPress={() => setExpanded(false)}
        style={styles.pastCardExpanded}
      >
        <View style={styles.expandedHeader}>
          <Text style={styles.expandedDate}>
            {entry.entryDate
              ? format(parseISO(entry.entryDate), 'EEEE, MMM d')
              : format(parseISO(entry.createdAt), 'EEEE, MMM d')}
          </Text>
          <View style={styles.expandedHeaderRight}>
            <Pressable
              onPress={() => onEdit(entry)}
              hitSlop={8}
              style={({ pressed }) => [pressed && { opacity: 0.6 }]}
            >
              <Ionicons name="pencil-outline" size={14} color={Colors.primary} />
            </Pressable>
            <Ionicons name="chevron-up" size={14} color={Colors.textDim} />
          </View>
        </View>
        <View style={styles.expandedGratitudes}>
          {entry.gratitudes.map((g, i) => (
            <Text key={i} style={styles.expandedGratitude}>
              {i + 1}. {g}
            </Text>
          ))}
        </View>
        {entry.improvement ? (
          <View style={styles.expandedBlock}>
            <Text style={styles.expandedBlockLabel}>Improvement</Text>
            <Text style={styles.expandedBlockText}>{entry.improvement}</Text>
          </View>
        ) : null}
        {entry.content ? (
          <View style={styles.expandedBlock}>
            <Text style={styles.expandedBlockLabel}>Thoughts</Text>
            <Text style={styles.expandedBlockText}>{entry.content}</Text>
          </View>
        ) : null}
      </GradientCard>
    );
  }

  return (
    <GradientCard
      gradient={[moodColor + '15', 'transparent']}
      onPress={() => setExpanded(true)}
      style={styles.pastCard}
    >
      <Text style={styles.pastCardDate}>{dateStr}</Text>
      <View style={styles.pastCardCenter}>
        <Ionicons
          name={moodIcon as keyof typeof Ionicons.glyphMap}
          size={40}
          color={moodColor}
        />
      </View>
      <View style={styles.pastCardBottom}>
        <Text style={styles.pastCardPreview} numberOfLines={1}>
          {entry.gratitudes[0]}
        </Text>
        <View style={styles.pastCardXp}>
          <Ionicons name="flash" size={10} color={Colors.accent} />
          <Text style={styles.pastCardXpText}>+{entry.xpAwarded}</Text>
        </View>
      </View>
    </GradientCard>
  );
}

/* ──────────────── Styles ──────────────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  headerLeft: {},
  title: {
    fontSize: FontSize['3xl'],
    fontFamily: FontFamily.extrabold,
    color: Colors.foreground,
  },
  subtitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  editBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  writeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.glow(Colors.primary, 0.3),
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

  /* ── Writing Form ── */
  writeForm: {
    gap: Spacing.lg,
  },
  formTitle: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.bold,
    color: Colors.foreground,
  },
  formLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },

  /* Mood — large circles */
  moodSection: {},
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  moodCircleOuter: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  moodCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodCircleLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semibold,
    color: Colors.textMuted,
  },

  /* Gratitudes */
  gratitudeSection: {},
  gratitudeInputs: {
    gap: Spacing.sm,
  },
  gratitudeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  gratitudeNumberCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gratitudeNumberText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bold,
    color: Colors.background,
  },
  gratitudeInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.sm,
    color: Colors.foreground,
    fontFamily: FontFamily.regular,
  },

  /* Text areas */
  section: {},
  textArea: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.sm,
    color: Colors.foreground,
    fontFamily: FontFamily.regular,
    textAlignVertical: 'top',
  },

  /* XP Preview */
  xpPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.accentBg,
    padding: Spacing.md,
    borderRadius: Radius.lg,
  },
  xpPreviewLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semibold,
    color: Colors.textSecondary,
  },
  xpPreviewValue: {
    fontSize: FontSize.xl,
    fontFamily: FontFamily.extrabold,
    color: Colors.accent,
  },

  /* Form actions */
  formActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelBtnText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semibold,
    color: Colors.textSecondary,
  },
  saveBtn: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary,
  },
  saveBtnText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold,
    color: Colors.background,
  },

  /* ── Featured Today Card ── */
  featuredCard: {
    ...Shadows.cardRaised,
  },
  featuredTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  featuredMoodRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semibold,
    color: Colors.textSecondary,
  },
  featuredMoodText: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.bold,
  },
  featuredGratitudes: {
    marginTop: Spacing.md,
    gap: 8,
  },
  featuredGratitudeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  featuredGratitudeCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredGratitudeNum: {
    fontSize: 11,
    fontFamily: FontFamily.bold,
  },
  featuredGratitudeText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.foreground,
    fontFamily: FontFamily.regular,
  },
  featuredFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  featuredFooterText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontFamily: FontFamily.regular,
  },
  featuredFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  tapToEditText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.medium,
    color: Colors.primary,
    fontStyle: 'italic',
  },
  featuredXpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.accentBg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  featuredXpText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bold,
    color: Colors.accent,
  },

  /* ── Past Entries Gallery ── */
  pastSection: {
    gap: Spacing.sm,
  },
  pastSectionTitle: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingLeft: 2,
  },
  pastGallery: {
    gap: Spacing.sm,
    paddingRight: Spacing.lg,
  },

  /* Individual past card */
  pastCard: {
    width: 200,
    height: 170,
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  pastCardDate: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semibold,
    color: Colors.textSecondary,
  },
  pastCardCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  pastCardBottom: {
    gap: 6,
  },
  pastCardPreview: {
    fontSize: FontSize.xs,
    color: Colors.foreground,
    fontFamily: FontFamily.regular,
    fontStyle: 'italic',
  },
  pastCardXp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  pastCardXpText: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
    color: Colors.accent,
  },

  /* Expanded past card (inline) */
  pastCardExpanded: {
    width: 280,
    padding: Spacing.md,
  },
  expandedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  expandedHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  expandedDate: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semibold,
    color: Colors.foreground,
  },
  expandedGratitudes: {
    gap: 4,
  },
  expandedGratitude: {
    fontSize: FontSize.sm,
    color: Colors.foreground,
    lineHeight: 20,
    fontFamily: FontFamily.regular,
  },
  expandedBlock: {
    marginTop: Spacing.sm,
    gap: 4,
  },
  expandedBlockLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  expandedBlockText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    fontFamily: FontFamily.regular,
  },
});
