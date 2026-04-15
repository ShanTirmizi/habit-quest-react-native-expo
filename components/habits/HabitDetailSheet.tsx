import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { BottomSheetTextInput as TextInput } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { FontSize, Spacing, Radius, FontFamily, getCategoryColors, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { BadgePill } from '@/components/ui/BadgePill';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { AutomaticityArc } from './AutomaticityArc';
import type { Habit, HabitCategory, HabitFrequencyType, TimeOfDay, ReflectionMood, MicroReflection } from '@/types';
import { FREQUENCY_LABELS, REFLECTION_MOOD_CONFIG, DAYS_OF_WEEK, TIME_OF_DAY_CONFIG } from '@/types';
import type { AutomaticityInfo } from '@/lib/automaticity';
import type { KeystoneInfo } from '@/lib/keystone-detection';
import type { DifficultySuggestion } from '@/lib/adaptive-difficulty';

// ── Edit mode types ──

export interface HabitUpdateData {
  name?: string;
  category?: HabitCategory;
  xpReward?: number;
  frequency?: { type: HabitFrequencyType; daysOfWeek?: number[]; timesPerWeek?: number };
  timeOfDay?: TimeOfDay;
  location?: string;
  trigger?: string;
  rewardBundle?: string;
  clearLocation?: boolean;
  clearTrigger?: boolean;
  clearRewardBundle?: boolean;
}

const CATEGORY_OPTIONS: { value: HabitCategory; tKey: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'health', tKey: 'category.health', icon: 'heart' },
  { value: 'career', tKey: 'category.career', icon: 'briefcase' },
  { value: 'mind', tKey: 'category.mind', icon: 'bulb' },
  { value: 'life', tKey: 'category.life', icon: 'leaf' },
];

const FREQUENCY_OPTIONS: { value: HabitFrequencyType; tKey: string }[] = [
  { value: 'daily', tKey: 'frequency.daily' },
  { value: 'weekdays', tKey: 'frequency.weekdays' },
  { value: 'weekends', tKey: 'frequency.weekends' },
  { value: 'custom', tKey: 'frequency.custom' },
  { value: 'timesPerWeek', tKey: 'frequency.timesPerWeek' },
];

const TIME_OPTIONS: { value: TimeOfDay; tKey: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'morning', tKey: 'time.morning', icon: 'sunny-outline' },
  { value: 'afternoon', tKey: 'time.afternoon', icon: 'partly-sunny-outline' },
  { value: 'evening', tKey: 'time.evening', icon: 'moon-outline' },
  { value: 'anytime', tKey: 'time.anytime', icon: 'time-outline' },
];

const XP_OPTIONS = [5, 10, 15, 20, 25, 30, 40, 50];

interface HabitDetailSheetProps {
  habit: Habit | null;
  isCompleted: boolean;
  onClose: () => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAddNote: (habitId: string, text: string) => void;
  onUpdate?: (habitId: string, data: HabitUpdateData) => void;
  automaticityInfo?: AutomaticityInfo | null;
  streakFreezes?: number;
  onHibernate?: (id: string) => void;
  onWake?: (id: string) => void;
  onUseStreakFreeze?: () => void;
  keystoneInfo?: KeystoneInfo | null;
  difficultySuggestion?: DifficultySuggestion | null;
  recentReflections?: MicroReflection[];
}

export function HabitDetailSheet({
  habit,
  isCompleted,
  onClose,
  onToggle,
  onDelete,
  onAddNote,
  onUpdate,
  automaticityInfo,
  streakFreezes,
  onHibernate,
  onWake,
  onUseStreakFreeze,
  keystoneInfo,
  difficultySuggestion,
  recentReflections,
}: HabitDetailSheetProps) {
  const { colors } = useTheme();
  const { t } = useTranslation('habit-detail');
  const styles = useMemo(() => createStyles(colors), [colors]);
  const categoryColors = useMemo(() => getCategoryColors(colors), [colors]);
  const [noteText, setNoteText] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);

  // ── Edit mode state ──
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<HabitCategory>('health');
  const [editXp, setEditXp] = useState(10);
  const [editFreqType, setEditFreqType] = useState<HabitFrequencyType>('daily');
  const [editDaysOfWeek, setEditDaysOfWeek] = useState<number[]>([]);
  const [editTimesPerWeek, setEditTimesPerWeek] = useState(3);
  const [editTimeOfDay, setEditTimeOfDay] = useState<TimeOfDay>('anytime');
  const [editLocation, setEditLocation] = useState('');
  const [editTrigger, setEditTrigger] = useState('');
  const [editRewardBundle, setEditRewardBundle] = useState('');

  // Reset edit state when habit changes
  useEffect(() => {
    if (habit) {
      setEditName(habit.name);
      setEditCategory(habit.category);
      setEditXp(habit.xpReward);
      setEditFreqType(habit.frequency?.type ?? 'daily');
      setEditDaysOfWeek(habit.frequency?.daysOfWeek ?? []);
      setEditTimesPerWeek(habit.frequency?.timesPerWeek ?? 3);
      setEditTimeOfDay(habit.timeOfDay ?? 'anytime');
      setEditLocation(habit.location ?? '');
      setEditTrigger(habit.trigger ?? '');
      setEditRewardBundle(habit.rewardBundle ?? '');
      setIsEditing(false);
    }
  }, [habit]);

  if (!habit) return null;

  const categoryColor = categoryColors[habit.category] || colors.textSecondary;
  const freqLabel = habit.frequency?.type
    ? FREQUENCY_LABELS[habit.frequency.type]
    : t('frequency.fallback');

  const handleStartEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (habit) {
      setEditName(habit.name);
      setEditCategory(habit.category);
      setEditXp(habit.xpReward);
      setEditFreqType(habit.frequency?.type ?? 'daily');
      setEditDaysOfWeek(habit.frequency?.daysOfWeek ?? []);
      setEditTimesPerWeek(habit.frequency?.timesPerWeek ?? 3);
      setEditTimeOfDay(habit.timeOfDay ?? 'anytime');
      setEditLocation(habit.location ?? '');
      setEditTrigger(habit.trigger ?? '');
      setEditRewardBundle(habit.rewardBundle ?? '');
    }
    setIsEditing(false);
  };

  const handleSaveEdit = () => {
    if (!onUpdate || !editName.trim()) return;
    const data: HabitUpdateData = {};

    if (editName.trim() !== habit.name) data.name = editName.trim();
    if (editCategory !== habit.category) data.category = editCategory;
    if (editXp !== habit.xpReward) data.xpReward = editXp;
    if (editTimeOfDay !== (habit.timeOfDay ?? 'anytime')) data.timeOfDay = editTimeOfDay;

    // Frequency
    const oldFreqType = habit.frequency?.type ?? 'daily';
    if (editFreqType !== oldFreqType ||
        JSON.stringify(editDaysOfWeek) !== JSON.stringify(habit.frequency?.daysOfWeek ?? []) ||
        editTimesPerWeek !== (habit.frequency?.timesPerWeek ?? 3)) {
      const freq: HabitUpdateData['frequency'] = { type: editFreqType };
      if (editFreqType === 'custom') freq.daysOfWeek = editDaysOfWeek;
      if (editFreqType === 'timesPerWeek') freq.timesPerWeek = editTimesPerWeek;
      data.frequency = freq;
    }

    // Location
    if (editLocation.trim() !== (habit.location ?? '')) {
      if (editLocation.trim()) {
        data.location = editLocation.trim();
      } else {
        data.clearLocation = true;
      }
    }

    // Trigger
    if (editTrigger.trim() !== (habit.trigger ?? '')) {
      if (editTrigger.trim()) {
        data.trigger = editTrigger.trim();
      } else {
        data.clearTrigger = true;
      }
    }

    // Reward bundle
    if (editRewardBundle.trim() !== (habit.rewardBundle ?? '')) {
      if (editRewardBundle.trim()) {
        data.rewardBundle = editRewardBundle.trim();
      } else {
        data.clearRewardBundle = true;
      }
    }

    if (Object.keys(data).length > 0) {
      onUpdate(habit.id, data);
    }
    setIsEditing(false);
  };

  const toggleDayOfWeek = (day: number) => {
    setEditDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const handleDelete = () => {
    Alert.alert(
      t('delete.title'),
      t('delete.message', { name: habit.name }),
      [
        { text: t('delete.cancel'), style: 'cancel' },
        {
          text: t('delete.confirm'),
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
    <BottomSheet visible={!!habit} onClose={() => { setIsEditing(false); onClose(); }} title={isEditing ? t('editTitle') : habit.name}>
      <View style={styles.container}>
        {/* Edit Mode */}
        {isEditing ? (
          <View style={styles.editContainer}>
            {/* Name */}
            <View style={styles.editSection}>
              <Text style={styles.editLabel}>{t('label.name')}</Text>
              <TextInput
                style={styles.editInput}
                value={editName}
                onChangeText={setEditName}
                placeholder={t('placeholder.habitName')}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Category */}
            <View style={styles.editSection}>
              <Text style={styles.editLabel}>{t('label.category')}</Text>
              <View style={styles.editChipRow}>
                {CATEGORY_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    onPress={() => setEditCategory(opt.value)}
                    style={[
                      styles.editChip,
                      editCategory === opt.value && { backgroundColor: categoryColors[opt.value] + '25', borderColor: categoryColors[opt.value] },
                    ]}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={14}
                      color={editCategory === opt.value ? categoryColors[opt.value] : colors.textMuted}
                    />
                    <Text style={[
                      styles.editChipText,
                      editCategory === opt.value && { color: categoryColors[opt.value] },
                    ]}>
                      {t(opt.tKey)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* XP Reward */}
            <View style={styles.editSection}>
              <Text style={styles.editLabel}>{t('label.xpReward')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.editChipRow}>
                  {XP_OPTIONS.map((xp) => (
                    <Pressable
                      key={xp}
                      onPress={() => setEditXp(xp)}
                      style={[
                        styles.editChip,
                        editXp === xp && { backgroundColor: colors.primaryBg, borderColor: colors.primary },
                      ]}
                    >
                      <Text style={[
                        styles.editChipText,
                        editXp === xp && { color: colors.primary },
                      ]}>
                        {xp} XP
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Frequency */}
            <View style={styles.editSection}>
              <Text style={styles.editLabel}>{t('label.frequency')}</Text>
              <View style={styles.editChipRow}>
                {FREQUENCY_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    onPress={() => setEditFreqType(opt.value)}
                    style={[
                      styles.editChip,
                      editFreqType === opt.value && { backgroundColor: colors.primaryBg, borderColor: colors.primary },
                    ]}
                  >
                    <Text style={[
                      styles.editChipText,
                      editFreqType === opt.value && { color: colors.primary },
                    ]}>
                      {t(opt.tKey)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Custom days picker */}
              {editFreqType === 'custom' ? (
                <View style={styles.editDaysRow}>
                  {DAYS_OF_WEEK.map((dayLabel, idx) => (
                    <Pressable
                      key={idx}
                      onPress={() => toggleDayOfWeek(idx)}
                      style={[
                        styles.editDayChip,
                        editDaysOfWeek.includes(idx) && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                    >
                      <Text style={[
                        styles.editDayText,
                        editDaysOfWeek.includes(idx) && { color: '#fff' },
                      ]}>
                        {dayLabel.slice(0, 2)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}

              {/* Times per week picker */}
              {editFreqType === 'timesPerWeek' ? (
                <View style={styles.editTimesRow}>
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <Pressable
                      key={n}
                      onPress={() => setEditTimesPerWeek(n)}
                      style={[
                        styles.editDayChip,
                        editTimesPerWeek === n && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                    >
                      <Text style={[
                        styles.editDayText,
                        editTimesPerWeek === n && { color: '#fff' },
                      ]}>
                        {n}x
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>

            {/* Time of Day */}
            <View style={styles.editSection}>
              <Text style={styles.editLabel}>{t('label.timeOfDay')}</Text>
              <View style={styles.editChipRow}>
                {TIME_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    onPress={() => setEditTimeOfDay(opt.value)}
                    style={[
                      styles.editChip,
                      editTimeOfDay === opt.value && { backgroundColor: colors.primaryBg, borderColor: colors.primary },
                    ]}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={14}
                      color={editTimeOfDay === opt.value ? colors.primary : colors.textMuted}
                    />
                    <Text style={[
                      styles.editChipText,
                      editTimeOfDay === opt.value && { color: colors.primary },
                    ]}>
                      {t(opt.tKey)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Location */}
            <View style={styles.editSection}>
              <Text style={styles.editLabel}>{t('label.location')}</Text>
              <TextInput
                style={styles.editInput}
                value={editLocation}
                onChangeText={setEditLocation}
                placeholder={t('placeholder.location')}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Trigger */}
            <View style={styles.editSection}>
              <Text style={styles.editLabel}>{t('label.trigger')}</Text>
              <TextInput
                style={styles.editInput}
                value={editTrigger}
                onChangeText={setEditTrigger}
                placeholder={t('placeholder.trigger')}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Reward Bundle */}
            <View style={styles.editSection}>
              <Text style={styles.editLabel}>{t('label.rewardBundle')}</Text>
              <TextInput
                style={styles.editInput}
                value={editRewardBundle}
                onChangeText={setEditRewardBundle}
                placeholder={t('placeholder.rewardBundle')}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Save / Cancel */}
            <View style={styles.editActions}>
              <Pressable onPress={handleCancelEdit} style={styles.editCancelBtn}>
                <Text style={styles.editCancelText}>{t('button.cancel')}</Text>
              </Pressable>
              <Pressable
                onPress={handleSaveEdit}
                style={[styles.editSaveBtn, !editName.trim() && { opacity: 0.5 }]}
                disabled={!editName.trim()}
              >
                <Ionicons name="checkmark" size={16} color="#fff" />
                <Text style={styles.editSaveText}>{t('button.saveChanges')}</Text>
              </Pressable>
            </View>
          </View>
        ) : (
        <>
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
              <Text style={styles.aiBadgeText}>{t('badge.aiGenerated')}</Text>
            </View>
          ) : null}
          {onUpdate ? (
            <Pressable onPress={handleStartEdit} style={styles.editBadge} hitSlop={8}>
              <Ionicons name="pencil" size={12} color={colors.primary} />
              <Text style={styles.editBadgeText}>{t('button.edit')}</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="flame" size={20} color={colors.accent} />
            <Text style={styles.statValue}>{habit.streak}</Text>
            <Text style={styles.statLabel}>{t('stat.streak')}</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="bar-chart" size={20} color={colors.info} />
            <Text style={styles.statValue}>{habit.completedDates.length}</Text>
            <Text style={styles.statLabel}>{t('stat.total')}</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="flash" size={20} color={colors.primary} />
            <Text style={styles.statValue}>
              {habit.completedDates.length * habit.xpReward}
            </Text>
            <Text style={styles.statLabel}>{t('stat.xpEarned')}</Text>
          </View>
        </View>

        {/* Automaticity Meter */}
        {automaticityInfo && automaticityInfo.score > 0 ? (
          <View style={styles.automaticitySection}>
            <View style={styles.automaticitySectionHeader}>
              <Text style={styles.sectionTitle}>{t('section.automaticity')}</Text>
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
                      ? t('automaticity.lockedIn')
                      : t('automaticity.daysToLockIn', { days: automaticityInfo.daysToLockIn })}
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
                {t('automaticity.detail', { completions: automaticityInfo.totalCompletions, days: automaticityInfo.daysSinceStart, rate: Math.round(automaticityInfo.completionRate * 100) })}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Temptation Bundle */}
        {habit.rewardBundle ? (
          <View style={styles.bundleCard}>
            <View style={styles.bundleHeader}>
              <Ionicons name="gift-outline" size={16} color={colors.accent} />
              <Text style={styles.bundleTitleText}>{t('section.rewardBundle')}</Text>
            </View>
            <Text style={styles.bundleReward}>{habit.rewardBundle}</Text>
          </View>
        ) : null}

        {/* If-Then Blueprint */}
        {(habit.location || habit.trigger) ? (
          <View style={styles.intentionSection}>
            <Text style={styles.sectionTitle}>{t('section.ifThenBlueprint')}</Text>
            <View style={styles.blueprintCard}>
              {habit.trigger ? (
                <View style={styles.blueprintRow}>
                  <Text style={styles.blueprintKeyword}>{t('blueprint.if')}</Text>
                  <Text style={styles.blueprintText}>{habit.trigger}</Text>
                </View>
              ) : null}
              <View style={styles.blueprintRow}>
                <Text style={[styles.blueprintKeyword, { color: colors.success }]}>{t('blueprint.then')}</Text>
                <Text style={styles.blueprintText}>{habit.name}</Text>
              </View>
              {habit.location ? (
                <View style={styles.blueprintRow}>
                  <Text style={[styles.blueprintKeyword, { color: colors.info }]}>{t('blueprint.at')}</Text>
                  <Text style={styles.blueprintText}>{habit.location}</Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Keystone Badge */}
        {keystoneInfo && keystoneInfo.isKeystone ? (
          <View style={styles.keystoneCard}>
            <View style={styles.keystoneHeader}>
              <Ionicons name="diamond-outline" size={16} color={colors.accent} />
              <Text style={styles.keystoneTitleText}>{t('section.keystoneHabit')}</Text>
              <BadgePill label={`${keystoneInfo.score}%`} color={colors.accent} size="sm" />
            </View>
            <Text style={styles.keystoneBody}>
              Completing this habit makes your other habits more likely to get done.
            </Text>
            {keystoneInfo.influencedHabits.length > 0 ? (
              <View style={styles.keystoneInfluences}>
                {keystoneInfo.influencedHabits.map((inf) => (
                  <View key={inf.habitId} style={styles.influenceRow}>
                    <Ionicons name="trending-up" size={12} color={colors.success} />
                    <Text style={styles.influenceText}>
                      +{inf.liftPercent}% more likely to do {inf.name}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Adaptive Difficulty Suggestion */}
        {difficultySuggestion ? (
          <View style={[
            styles.difficultyCard,
            {
              borderColor: difficultySuggestion.direction === 'scale_up'
                ? `${colors.success}30` : `${colors.warning}30`,
            },
          ]}>
            <View style={styles.difficultyHeader}>
              <Ionicons
                name={difficultySuggestion.direction === 'scale_up' ? 'trending-up' : 'trending-down'}
                size={16}
                color={difficultySuggestion.direction === 'scale_up' ? colors.success : colors.warning}
              />
              <Text style={styles.difficultyTitleText}>
                {difficultySuggestion.direction === 'scale_up' ? 'Ready to Level Up' : 'Consider Scaling Down'}
              </Text>
            </View>
            <Text style={styles.difficultyReason}>{difficultySuggestion.reason}</Text>
            <Text style={styles.difficultySuggestion}>{difficultySuggestion.suggestion}</Text>
          </View>
        ) : null}

        {/* Micro-Reflection History */}
        {recentReflections && recentReflections.length > 0 ? (
          <View style={styles.reflectionSection}>
            <Text style={styles.sectionTitle}>Recent Reflections</Text>
            <View style={styles.reflectionDots}>
              {recentReflections.slice(0, 14).map((r, i) => {
                const config = REFLECTION_MOOD_CONFIG[r.mood];
                return (
                  <View
                    key={`${r.date}-${i}`}
                    style={[styles.reflectionDot, { backgroundColor: config.color }]}
                  />
                );
              })}
            </View>
            <View style={styles.reflectionLegend}>
              {(['energized', 'good', 'meh', 'tough'] as ReflectionMood[]).map((mood) => {
                const config = REFLECTION_MOOD_CONFIG[mood];
                const count = recentReflections.filter((r) => r.mood === mood).length;
                if (count === 0) return null;
                return (
                  <View key={mood} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: config.color }]} />
                    <Text style={styles.legendText}>{config.label} ({count})</Text>
                  </View>
                );
              })}
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
        </>
        )}
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

  // Keystone
  keystoneCard: {
    backgroundColor: `${colors.accent}08`,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: `${colors.accent}25`,
  },
  keystoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  keystoneTitleText: {
    flex: 1,
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold,
    color: colors.accent,
  },
  keystoneBody: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.regular,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  keystoneInfluences: {
    gap: 4,
  },
  influenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  influenceText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.medium,
    color: colors.success,
  },

  // Difficulty
  difficultyCard: {
    backgroundColor: colors.surfaceLight,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  difficultyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  difficultyTitleText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold,
    color: colors.foreground,
  },
  difficultyReason: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.medium,
    color: colors.textMuted,
  },
  difficultySuggestion: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  // Reflections
  reflectionSection: {
    gap: Spacing.xs,
  },
  reflectionDots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  reflectionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  reflectionLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.medium,
    color: colors.textMuted,
  },

  // Edit badge
  editBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryBg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  editBadgeText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semibold,
    color: colors.primary,
  },

  // Edit mode
  editContainer: {
    gap: Spacing.lg,
  },
  editSection: {
    gap: Spacing.xs,
  },
  editLabel: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editInput: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: FontSize.sm,
    fontFamily: FontFamily.medium,
    color: colors.foreground,
  },
  editChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  editChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLight,
  },
  editChipText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semibold,
    color: colors.textMuted,
  },
  editDaysRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  editDayChip: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLight,
  },
  editDayText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semibold,
    color: colors.textMuted,
  },
  editTimesRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  editActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  editCancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLight,
  },
  editCancelText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semibold,
    color: colors.textSecondary,
  },
  editSaveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    backgroundColor: colors.primary,
  },
  editSaveText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semibold,
    color: '#fff',
  },
});
