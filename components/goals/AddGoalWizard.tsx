import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAction, useMutation, useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { useTheme } from '@/contexts/theme-context';
import { FontSize, Spacing, Radius, FontFamily, Shadows, type ThemeColors } from '@/constants/theme';
import { BottomSheet, BottomSheetTextInput } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BadgePill } from '@/components/ui/BadgePill';
import { useToast } from '@/contexts/toast-context';
import type {
  GoalCategory,
  GoalLevel,
  ContextQuestion,
  ContextAnswer,
  SuggestedHabit,
  SuggestedMilestone,
  SuggestedPhase,
  HabitCategory,
} from '@/types';
import { GOAL_CATEGORY_CONFIG } from '@/types';

// ============================================
// Types
// ============================================

interface AddGoalWizardProps {
  visible: boolean;
  onClose: () => void;
  userId: Id<'users'>;
}

type WizardStep = 'goal-input' | 'context' | 'generating' | 'review' | 'creating' | 'confirmation';

const STEP_IDS: WizardStep[] = ['goal-input', 'context', 'generating', 'review', 'creating', 'confirmation'];

const STEP_I18N_MAP: Record<WizardStep, { titleKey: string; descKey: string }> = {
  'goal-input': { titleKey: 'wizard.steps.goalInput.title', descKey: 'wizard.steps.goalInput.description' },
  context: { titleKey: 'wizard.steps.context.title', descKey: 'wizard.steps.context.description' },
  generating: { titleKey: 'wizard.steps.generating.title', descKey: 'wizard.steps.generating.description' },
  review: { titleKey: 'wizard.steps.review.title', descKey: 'wizard.steps.review.description' },
  creating: { titleKey: 'wizard.steps.creating.title', descKey: 'wizard.steps.creating.description' },
  confirmation: { titleKey: 'wizard.steps.confirmation.title', descKey: 'wizard.steps.confirmation.description' },
};

const GOAL_LEVEL_KEYS: GoalLevel[] = ['beginner', 'intermediate', 'advanced'];

const TIME_OPTIONS = [15, 30, 45, 60];

// Map goal categories to habit categories (for the wizard)
const GOAL_TO_HABIT_CATEGORY: Record<GoalCategory, HabitCategory> = {
  fitness: 'health',
  health: 'health',
  learning: 'mind',
  career: 'career',
  creative: 'mind',
  financial: 'life',
};

// ============================================
// Inline Calendar Picker
// ============================================

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function CalendarPicker({
  selectedDate,
  onSelectDate,
  minDate,
  colors,
}: {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  minDate: string;
  colors: ThemeColors;
}) {
  const calStyles = useMemo(() => createCalendarStyles(colors), [colors]);

  // Parse selected or default to 90 days from now
  const defaultDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 90);
    return d;
  }, []);

  const selected = selectedDate ? new Date(selectedDate + 'T00:00:00') : defaultDate;
  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());

  const minD = new Date(minDate + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const goToPrevMonth = useCallback(() => {
    Haptics.selectionAsync();
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  }, [viewMonth, viewYear]);

  const goToNextMonth = useCallback(() => {
    Haptics.selectionAsync();
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  }, [viewMonth, viewYear]);

  // Can go back?
  const canGoPrev = viewYear > minD.getFullYear() || (viewYear === minD.getFullYear() && viewMonth > minD.getMonth());

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const grid: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) grid.push(null);
    for (let d = 1; d <= daysInMonth; d++) grid.push(d);
    return grid;
  }, [viewYear, viewMonth]);

  const formatDateStr = (day: number) => {
    const m = String(viewMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${viewYear}-${m}-${d}`;
  };

  const selectedStr = selectedDate || `${defaultDate.getFullYear()}-${String(defaultDate.getMonth() + 1).padStart(2, '0')}-${String(defaultDate.getDate()).padStart(2, '0')}`;

  return (
    <View style={calStyles.container}>
      {/* Month/Year nav */}
      <View style={calStyles.header}>
        <Pressable onPress={goToPrevMonth} disabled={!canGoPrev} style={calStyles.navBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={20} color={canGoPrev ? colors.foreground : colors.textMuted} />
        </Pressable>
        <Text style={calStyles.monthLabel}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
        <Pressable onPress={goToNextMonth} style={calStyles.navBtn} hitSlop={8}>
          <Ionicons name="chevron-forward" size={20} color={colors.foreground} />
        </Pressable>
      </View>

      {/* Day-of-week headers */}
      <View style={calStyles.weekRow}>
        {DAY_LABELS.map((d) => (
          <Text key={d} style={calStyles.weekLabel}>{d}</Text>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={calStyles.grid}>
        {calendarDays.map((day, i) => {
          if (day === null) return <View key={`e-${i}`} style={calStyles.dayCell} />;

          const dateStr = formatDateStr(day);
          const dateObj = new Date(viewYear, viewMonth, day);
          const isPast = dateObj < minD;
          const isSelected = dateStr === selectedStr;
          const isToday = dateObj.getTime() === today.getTime();

          return (
            <Pressable
              key={dateStr}
              style={calStyles.dayCell}
              disabled={isPast}
              onPress={() => {
                Haptics.selectionAsync();
                onSelectDate(dateStr);
              }}
            >
              <View
                style={[
                  calStyles.dayCircle,
                  isSelected && calStyles.dayCircleSelected,
                  isToday && !isSelected && calStyles.dayCircleToday,
                ]}
              >
                <Text
                  style={[
                    calStyles.dayText,
                    isPast && calStyles.dayTextDisabled,
                    isSelected && calStyles.dayTextSelected,
                  ]}
                >
                  {day}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const createCalendarStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    marginTop: Spacing.sm,
    backgroundColor: colors.surfaceLight,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  navBtn: {
    padding: 4,
  },
  monthLabel: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.semibold,
    color: colors.foreground,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
  },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: FontSize.xs,
    fontFamily: FontFamily.medium,
    color: colors.textMuted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.285%',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleSelected: {
    backgroundColor: colors.primary,
  },
  dayCircleToday: {
    borderWidth: 1,
    borderColor: colors.textMuted,
  },
  dayText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.medium,
    color: colors.foreground,
  },
  dayTextDisabled: {
    color: colors.textMuted,
    opacity: 0.4,
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontFamily: FontFamily.bold,
  },
});

// ============================================
// Main Component
// ============================================

export function AddGoalWizard({ visible, onClose, userId }: AddGoalWizardProps) {
  const { colors } = useTheme();
  const { t } = useTranslation('goals');
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { showToast } = useToast();

  // Convex actions & mutations
  const generateQuestions = useAction(api.goalAI.generateContextQuestions);
  const generateHabitsAction = useAction(api.goalAI.generateGoalHabits);
  const createGoalMutation = useMutation(api.goals.createGoal);
  const addHabitMutation = useMutation(api.habits.addHabit);
  const linkHabitMutation = useMutation(api.goals.linkHabitToGoal);
  const updatePhasesMutation = useMutation(api.goals.updateGoalPhases);

  // Get existing habits for deduplication
  const existingHabits = useQuery(api.habits.getHabits, userId ? { userId } : 'skip');

  // Wizard state
  const [step, setStep] = useState<WizardStep>('goal-input');
  const [showCalendar, setShowCalendar] = useState(false);

  // Step 1: Goal input
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<GoalCategory>('fitness');
  const [targetDate, setTargetDate] = useState('');
  const [currentLevel, setCurrentLevel] = useState<GoalLevel>('beginner');
  const [dailyTimeAvailable, setDailyTimeAvailable] = useState(30);

  // Step 2: Context questions
  const [contextQuestions, setContextQuestions] = useState<ContextQuestion[]>([]);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string | string[]>>({});
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [questionsError, setQuestionsError] = useState<string | null>(null);

  // Step 3: Generation
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Step 4: Review
  const [suggestedHabits, setSuggestedHabits] = useState<(SuggestedHabit & { accepted: boolean })[]>([]);
  const [suggestedMilestones, setSuggestedMilestones] = useState<SuggestedMilestone[]>([]);
  const [suggestedPhases, setSuggestedPhases] = useState<SuggestedPhase[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  // Step 5: Creating
  const [isCreating, setIsCreating] = useState(false);
  const [creationProgress, setCreationProgress] = useState('');

  // ============================================
  // Helpers
  // ============================================

  const resetForm = useCallback(() => {
    setStep('goal-input');
    setTitle('');
    setDescription('');
    setCategory('fitness');
    setTargetDate('');
    setCurrentLevel('beginner');
    setDailyTimeAvailable(30);
    setContextQuestions([]);
    setQuestionAnswers({});
    setIsLoadingQuestions(false);
    setQuestionsError(null);
    setIsGenerating(false);
    setGenerationError(null);
    setSuggestedHabits([]);
    setSuggestedMilestones([]);
    setSuggestedPhases([]);
    setWarnings([]);
    setIsCreating(false);
    setCreationProgress('');
    setShowCalendar(false);
  }, []);

  const handleClose = useCallback(() => {
    onClose();
    // Delay reset so the sheet animates out first
    setTimeout(resetForm, 300);
  }, [onClose, resetForm]);

  // Calculate default target date (90 days from now)
  const getDefaultTargetDate = useCallback(() => {
    const date = new Date();
    date.setDate(date.getDate() + 90);
    return date.toISOString().split('T')[0];
  }, []);

  // Calculate weeks remaining
  const weeksRemaining = useMemo(() => {
    const dateStr = targetDate || getDefaultTargetDate();
    return Math.ceil(
      (new Date(dateStr).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 7)
    );
  }, [targetDate, getDefaultTargetDate]);

  // Validation
  const isStep1Valid = title.trim().length >= 3;
  const isStep2Valid = useMemo(() => {
    if (isLoadingQuestions) return false;
    if (contextQuestions.length === 0) return true; // Allow proceeding if questions failed
    return contextQuestions.every((q) => {
      const answer = questionAnswers[q.id];
      if (q.type === 'multiselect') {
        return Array.isArray(answer) && answer.length > 0;
      }
      return typeof answer === 'string' && answer.trim().length > 0;
    });
  }, [contextQuestions, questionAnswers, isLoadingQuestions]);

  const acceptedHabitsCount = suggestedHabits.filter((h) => h.accepted).length;

  // ============================================
  // Step Navigation
  // ============================================

  const fetchContextQuestions = useCallback(async () => {
    setIsLoadingQuestions(true);
    setQuestionsError(null);

    try {
      const result = await generateQuestions({
        title,
        description: description || undefined,
        category,
        targetDate: targetDate || getDefaultTargetDate(),
      });

      setContextQuestions(result.questions || []);
      // Initialize answers
      const initialAnswers: Record<string, string | string[]> = {};
      for (const q of result.questions || []) {
        initialAnswers[q.id] = q.type === 'multiselect' ? [] : '';
      }
      setQuestionAnswers(initialAnswers);
    } catch (error) {
      if (__DEV__) console.error('Error fetching context questions:', error);
      setQuestionsError(t('wizard.questionsError'));
    } finally {
      setIsLoadingQuestions(false);
    }
  }, [title, description, category, targetDate, generateQuestions, getDefaultTargetDate]);

  const goToContext = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep('context');
    if (contextQuestions.length === 0) {
      fetchContextQuestions();
    }
  }, [contextQuestions.length, fetchContextQuestions]);

  const goBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step === 'context') {
      setStep('goal-input');
    } else if (step === 'review') {
      setStep('context');
    }
  }, [step]);

  const generateHabits = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStep('generating');
    setIsGenerating(true);
    setGenerationError(null);

    // Build context answers
    const contextAnswersList: ContextAnswer[] = contextQuestions
      .map((q) => {
        const answer = questionAnswers[q.id];
        let answerStr: string;
        if (Array.isArray(answer)) {
          if (answer.includes('__none__')) {
            answerStr = 'None';
          } else {
            answerStr = answer.join(', ');
          }
        } else {
          answerStr = answer || '';
        }
        return { question: q.question, answer: answerStr };
      })
      .filter((a) => a.answer.trim().length > 0);

    try {
      const result = await generateHabitsAction({
        title,
        description: description || undefined,
        category,
        targetDate: targetDate || getDefaultTargetDate(),
        currentLevel,
        dailyTimeAvailable,
        contextAnswers: contextAnswersList,
        existingHabitNames: (existingHabits || []).map((h: any) => h.name),
      });

      setSuggestedHabits(
        (result.suggestedHabits || []).map((h: any) => ({ ...h, accepted: true }))
      );
      setSuggestedMilestones(result.milestones || []);
      setSuggestedPhases(result.phases || []);
      setWarnings(result.warnings || []);
      setStep('review');
    } catch (error) {
      if (__DEV__) console.error('Error generating habits:', error);
      setGenerationError(error instanceof Error ? error.message : 'Failed to generate habits');
      setStep('context');
    } finally {
      setIsGenerating(false);
    }
  }, [
    title,
    description,
    category,
    targetDate,
    currentLevel,
    dailyTimeAvailable,
    contextQuestions,
    questionAnswers,
    existingHabits,
    generateHabitsAction,
    getDefaultTargetDate,
  ]);

  const toggleHabitAcceptance = useCallback((index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSuggestedHabits((prev) =>
      prev.map((h, i) => (i === index ? { ...h, accepted: !h.accepted } : h))
    );
  }, []);

  const createGoalAndHabits = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStep('creating');
    setIsCreating(true);

    try {
      // 1. Convert milestones
      setCreationProgress(t('wizard.creating.creatingGoal'));
      const goalMilestones = suggestedMilestones.map((m, index) => {
        const milestoneDate = new Date();
        milestoneDate.setDate(milestoneDate.getDate() + m.targetWeek * 7);
        return {
          id: `milestone-${Date.now()}-${index}`,
          title: m.title,
          targetDate: milestoneDate.toISOString().split('T')[0],
          completed: false,
        };
      });

      // 2. Create the goal
      const goalId = await createGoalMutation({
        userId,
        title,
        description: description || undefined,
        category,
        targetDate: targetDate || getDefaultTargetDate(),
        currentLevel,
        dailyTimeAvailable,
        milestones: goalMilestones.length > 0 ? goalMilestones : undefined,
      });

      // 3. Create accepted habits and link them
      const acceptedHabits = suggestedHabits.filter((h) => h.accepted);
      const habitNameToIdMap = new Map<string, Id<'habits'>>();

      for (let i = 0; i < acceptedHabits.length; i++) {
        const habit = acceptedHabits[i];
        setCreationProgress(t('wizard.creating.creatingHabit', { current: i + 1, total: acceptedHabits.length }));

        const habitId = await addHabitMutation({
          userId,
          name: habit.name,
          category: habit.category,
          xpReward: habit.xpReward,
          frequency: habit.frequency,
          timeOfDay: habit.timeOfDay,
          location: habit.location,
          trigger: habit.trigger,
          rationale: habit.rationale,
          citation: habit.citation,
        });

        await linkHabitMutation({
          goalId,
          userId,
          habitId,
        });

        habitNameToIdMap.set(habit.name, habitId);
      }

      // 4. Save phases with mapped habit IDs
      if (suggestedPhases.length > 0 && habitNameToIdMap.size > 0) {
        setCreationProgress(t('wizard.creating.settingUpPhases'));
        const phasesWithIds = suggestedPhases
          .map((phase) => ({
            weekStart: phase.weekStart,
            weekEnd: phase.weekEnd,
            description: phase.description,
            habitUpdates: phase.habitProgressions
              .map((hp) => {
                const habitId = habitNameToIdMap.get(hp.habitName);
                if (!habitId) return null;
                return {
                  habitId,
                  newName: hp.newName,
                  newXpReward: hp.newXpReward,
                };
              })
              .filter((u): u is NonNullable<typeof u> => u !== null),
          }))
          .filter((p) => p.habitUpdates.length > 0);

        if (phasesWithIds.length > 0) {
          await updatePhasesMutation({
            goalId,
            userId,
            phases: phasesWithIds,
          });
        }
      }

      setStep('confirmation');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      if (__DEV__) console.error('Error creating goal:', error);
      showToast(t('wizard.creating.failed'), undefined, 'error');
      setStep('review');
    } finally {
      setIsCreating(false);
    }
  }, [
    title,
    description,
    category,
    targetDate,
    currentLevel,
    dailyTimeAvailable,
    suggestedMilestones,
    suggestedHabits,
    suggestedPhases,
    userId,
    createGoalMutation,
    addHabitMutation,
    linkHabitMutation,
    updatePhasesMutation,
    showToast,
    getDefaultTargetDate,
  ]);

  // ============================================
  // Step indicator progress
  // ============================================
  const currentStepIndex = STEP_IDS.indexOf(step);
  const visibleSteps = STEP_IDS.filter((s) => s !== 'generating' && s !== 'creating');

  // ============================================
  // Render
  // ============================================

  return (
    <BottomSheet visible={visible} onClose={handleClose} title={t(STEP_I18N_MAP[step].titleKey)}>
      <View style={styles.container}>
        {/* Progress Indicator */}
        <View style={styles.progressRow}>
          {visibleSteps.map((s) => {
            const actualIndex = STEP_IDS.indexOf(s);
            const isActive = actualIndex === currentStepIndex;
            const isComplete = actualIndex < currentStepIndex;
            return (
              <View
                key={s}
                style={[
                  styles.progressDot,
                  isActive && { backgroundColor: colors.primary },
                  isComplete && { backgroundColor: `${colors.primary}80` },
                ]}
              />
            );
          })}
        </View>

        <Text style={styles.stepDescription}>
          {t(STEP_I18N_MAP[step].descKey)}
        </Text>

        {/* ============================================ */}
        {/* Step 1: Goal Input */}
        {/* ============================================ */}
        {step === 'goal-input' && (
          <View style={styles.stepContent}>
            <Input
              label={t('wizard.goalLabel')}
              value={title}
              onChangeText={setTitle}
              placeholder={t('wizard.goalPlaceholder')}
              bottomSheet
            />

            <Input
              label={t('wizard.descriptionLabel')}
              value={description}
              onChangeText={setDescription}
              placeholder={t('wizard.descriptionPlaceholder')}
              multiline
              numberOfLines={2}
              containerStyle={{ marginTop: Spacing.md }}
              bottomSheet
            />

            {/* Category Selection */}
            <View style={styles.sectionContainer}>
              <Text style={styles.formLabel}>{t('wizard.categoryLabel')}</Text>
              <View style={styles.categoryGrid}>
                {(Object.entries(GOAL_CATEGORY_CONFIG) as [GoalCategory, typeof GOAL_CATEGORY_CONFIG['fitness']][]).map(
                  ([cat, config]) => (
                    <Pressable
                      key={cat}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setCategory(cat);
                      }}
                      style={[
                        styles.categoryChip,
                        category === cat && {
                          backgroundColor: `${config.color}20`,
                          borderColor: config.color,
                        },
                      ]}
                    >
                      <Ionicons
                        name={config.icon as keyof typeof Ionicons.glyphMap}
                        size={16}
                        color={category === cat ? config.color : colors.textMuted}
                      />
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

            {/* Target Date — Tap to expand calendar */}
            <View style={styles.sectionContainer}>
              <Text style={styles.formLabel}>{t('wizard.timelineLabel')}</Text>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setShowCalendar(!showCalendar);
                }}
                style={[styles.datePickerRow, showCalendar && { borderColor: colors.primary }]}
              >
                <Ionicons name="calendar-outline" size={18} color={showCalendar ? colors.primary : colors.textSecondary} />
                <Text style={[styles.datePickerText, showCalendar && { color: colors.primary }]}>
                  {targetDate || getDefaultTargetDate()}
                </Text>
                <Text style={styles.datePickerWeeks}>{t('wizard.weeksUnit', { count: weeksRemaining })}</Text>
                <Ionicons name={showCalendar ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
              </Pressable>
              {showCalendar && (
                <CalendarPicker
                  selectedDate={targetDate}
                  onSelectDate={(date) => {
                    setTargetDate(date);
                  }}
                  minDate={new Date().toISOString().split('T')[0]}
                  colors={colors}
                />
              )}
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Button title={t('wizard.cancel')} variant="ghost" onPress={handleClose} />
              <Button title={t('wizard.next')} onPress={goToContext} disabled={!isStep1Valid} />
            </View>
          </View>
        )}

        {/* ============================================ */}
        {/* Step 2: Context Questions */}
        {/* ============================================ */}
        {step === 'context' && (
          <View style={styles.stepContent}>
            {/* Experience Level */}
            <View style={styles.sectionContainer}>
              <Text style={styles.formLabel}>{t('wizard.levelLabel')}</Text>
              <View style={styles.levelGrid}>
                {GOAL_LEVEL_KEYS.map(
                  (level) => (
                    <Pressable
                      key={level}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setCurrentLevel(level);
                      }}
                      style={[
                        styles.levelChip,
                        currentLevel === level && styles.levelChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.levelLabel,
                          currentLevel === level && styles.levelLabelActive,
                        ]}
                      >
                        {t(`wizard.level.${level}`)}
                      </Text>
                      <Text style={styles.levelDesc}>{t(`wizard.level.${level}.description`)}</Text>
                    </Pressable>
                  )
                )}
              </View>
            </View>

            {/* Daily Time Available */}
            <View style={styles.sectionContainer}>
              <Text style={styles.formLabel}>
                {t('wizard.dailyTimeLabel')}
              </Text>
              <View style={styles.timeGrid}>
                {TIME_OPTIONS.map((mins) => (
                  <Pressable
                    key={mins}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setDailyTimeAvailable(mins);
                    }}
                    style={[
                      styles.timeChip,
                      dailyTimeAvailable === mins && styles.timeChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.timeChipText,
                        dailyTimeAvailable === mins && styles.timeChipTextActive,
                      ]}
                    >
                      {t('wizard.timeMinutes', { count: mins })}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* AI-Generated Questions */}
            {isLoadingQuestions ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>
                  {t('wizard.loadingQuestions')}
                </Text>
              </View>
            ) : contextQuestions.length > 0 ? (
              <View style={styles.questionsContainer}>
                <View style={styles.questionsHeader}>
                  <Ionicons name="sparkles" size={14} color={colors.primary} />
                  <Text style={styles.questionsHeaderText}>
                    {t('wizard.questionsHeader')}
                  </Text>
                </View>

                {contextQuestions.map((q, qi) => {
                  const isAnswered = q.type === 'multiselect'
                    ? ((questionAnswers[q.id] as string[]) || []).length > 0
                    : !!(questionAnswers[q.id] as string);

                  return (
                    <View key={q.id} style={styles.questionCard}>
                      {/* Question number + text */}
                      <View style={styles.questionHeader}>
                        <View style={[styles.questionNumber, isAnswered && { backgroundColor: `${colors.primary}30` }]}>
                          <Text style={[styles.questionNumberText, isAnswered && { color: colors.primary }]}>
                            {qi + 1}
                          </Text>
                        </View>
                        <Text style={styles.questionText}>{q.question}</Text>
                      </View>

                      {q.type === 'text' && (
                        <BottomSheetTextInput
                          style={styles.textAnswer}
                          placeholder={q.placeholder || t('wizard.answerPlaceholder')}
                          placeholderTextColor={colors.textMuted}
                          value={(questionAnswers[q.id] as string) || ''}
                          onChangeText={(text) =>
                            setQuestionAnswers((prev) => ({ ...prev, [q.id]: text }))
                          }
                          multiline
                          numberOfLines={2}
                          selectionColor={colors.primary}
                        />
                      )}

                      {q.type === 'select' && q.options && (
                        <View style={styles.optionsList}>
                          {q.options.map((option) => {
                            const isSelected = questionAnswers[q.id] === option;
                            return (
                              <Pressable
                                key={option}
                                onPress={() => {
                                  Haptics.selectionAsync();
                                  setQuestionAnswers((prev) => ({
                                    ...prev,
                                    [q.id]: option,
                                  }));
                                }}
                                style={[
                                  styles.optionRow,
                                  isSelected && styles.optionRowActive,
                                ]}
                              >
                                <View style={[styles.optionRadio, isSelected && styles.optionRadioActive]}>
                                  {isSelected && <View style={styles.optionRadioDot} />}
                                </View>
                                <Text
                                  style={[
                                    styles.optionRowText,
                                    isSelected && styles.optionRowTextActive,
                                  ]}
                                >
                                  {option}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      )}

                      {q.type === 'multiselect' && q.options && (
                        <View style={styles.optionsList}>
                          {q.options.map((option) => {
                            const selected = (questionAnswers[q.id] as string[]) || [];
                            const isSelected = selected.includes(option);
                            return (
                              <Pressable
                                key={option}
                                onPress={() => {
                                  Haptics.selectionAsync();
                                  setQuestionAnswers((prev) => {
                                    const current = (prev[q.id] as string[]) || [];
                                    const withoutNone = current.filter((o) => o !== '__none__');
                                    const updated = isSelected
                                      ? withoutNone.filter((o) => o !== option)
                                      : [...withoutNone, option];
                                    return { ...prev, [q.id]: updated };
                                  });
                                }}
                                style={[
                                  styles.optionRow,
                                  isSelected && styles.optionRowActive,
                                ]}
                              >
                                <View style={[styles.optionCheckbox, isSelected && styles.optionCheckboxActive]}>
                                  {isSelected && <Ionicons name="checkmark" size={12} color="#fff" />}
                                </View>
                                <Text
                                  style={[
                                    styles.optionRowText,
                                    isSelected && styles.optionRowTextActive,
                                  ]}
                                >
                                  {option}
                                </Text>
                              </Pressable>
                            );
                          })}
                          {/* None of the above */}
                          <Pressable
                            onPress={() => {
                              Haptics.selectionAsync();
                              setQuestionAnswers((prev) => {
                                const current = (prev[q.id] as string[]) || [];
                                const isNoneSelected = current.includes('__none__');
                                return {
                                  ...prev,
                                  [q.id]: isNoneSelected ? [] : ['__none__'],
                                };
                              });
                            }}
                            style={[
                              styles.optionRow,
                              ((questionAnswers[q.id] as string[]) || []).includes('__none__') &&
                                styles.optionRowActive,
                            ]}
                          >
                            <View style={[
                              styles.optionCheckbox,
                              ((questionAnswers[q.id] as string[]) || []).includes('__none__') && styles.optionCheckboxActive,
                            ]}>
                              {((questionAnswers[q.id] as string[]) || []).includes('__none__') && (
                                <Ionicons name="checkmark" size={12} color="#fff" />
                              )}
                            </View>
                            <Text
                              style={[
                                styles.optionRowText,
                                { color: colors.textMuted },
                                ((questionAnswers[q.id] as string[]) || []).includes('__none__') &&
                                  styles.optionRowTextActive,
                              ]}
                            >
                              {t('wizard.noneOfAbove')}
                            </Text>
                          </Pressable>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            ) : null}

            {questionsError && (
              <View style={styles.warningBox}>
                <Ionicons name="alert-circle" size={16} color={colors.warning} />
                <Text style={styles.warningText}>{questionsError}</Text>
              </View>
            )}

            {generationError && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={colors.danger} />
                <Text style={styles.errorText}>{generationError}</Text>
              </View>
            )}

            {/* Footer */}
            <View style={styles.footer}>
              <Button title={t('wizard.back')} variant="ghost" onPress={goBack} />
              <Button
                title={t('wizard.generateHabits')}
                onPress={generateHabits}
                disabled={!isStep2Valid || isGenerating}
                loading={isGenerating}
                icon={
                  !isGenerating ? (
                    <Ionicons name="sparkles" size={16} color="#FFFFFF" />
                  ) : undefined
                }
              />
            </View>
          </View>
        )}

        {/* ============================================ */}
        {/* Step 3: Generating */}
        {/* ============================================ */}
        {step === 'generating' && (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.generatingTitle}>
              {t('wizard.generating.title')}
            </Text>
            <Text style={styles.generatingSubtitle}>
              {t('wizard.generating.subtitle')}
            </Text>
          </View>
        )}

        {/* ============================================ */}
        {/* Step 4: Review */}
        {/* ============================================ */}
        {step === 'review' && (
          <View style={styles.stepContent}>
            {/* Warnings */}
            {warnings.length > 0 && (
              <View style={styles.warningBox}>
                <Ionicons name="alert-circle" size={16} color={colors.warning} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.warningTitle}>{t('wizard.review.warningTitle')}</Text>
                  {warnings.map((w, i) => (
                    <Text key={i} style={styles.warningText}>{w}</Text>
                  ))}
                </View>
              </View>
            )}

            {/* Suggested Habits */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Ionicons name="sparkles" size={14} color={colors.primary} />
                <Text style={styles.sectionTitle}>
                  {t('wizard.review.suggestedHabits', { count: acceptedHabitsCount })}
                </Text>
              </View>

              {suggestedHabits.map((habit, index) => (
                <Pressable
                  key={index}
                  onPress={() => toggleHabitAcceptance(index)}
                  style={[
                    styles.habitCard,
                    habit.accepted && styles.habitCardAccepted,
                    !habit.accepted && styles.habitCardRejected,
                  ]}
                >
                  <View style={styles.habitHeader}>
                    <View style={[
                      styles.checkbox,
                      habit.accepted && styles.checkboxChecked,
                    ]}>
                      {habit.accepted && (
                        <Ionicons name="checkmark" size={12} color={colors.background} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.habitName}>{habit.name}</Text>
                      <View style={styles.habitBadges}>
                        <BadgePill
                          label={habit.category}
                          color={getCategoryColor(habit.category, colors)}
                          size="sm"
                        />
                        <View style={styles.xpBadge}>
                          <Text style={styles.xpBadgeText}>{habit.xpReward} XP</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.habitRationale}>{habit.rationale}</Text>
                  {(habit.location || habit.trigger) && (
                    <Text style={styles.habitImplementation}>
                      {habit.location && `@ ${habit.location}`}
                      {habit.location && habit.trigger && ' '}
                      {habit.trigger && `(${habit.trigger})`}
                    </Text>
                  )}
                  {habit.citation && (
                    <Text style={styles.habitCitation}>
                      {habit.citation.author} ({habit.citation.year}): {habit.citation.finding}
                    </Text>
                  )}
                </Pressable>
              ))}
            </View>

            {/* Milestones */}
            {suggestedMilestones.length > 0 && (
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>{t('wizard.review.milestones')}</Text>
                <View style={styles.milestonesGrid}>
                  {suggestedMilestones.map((m, i) => (
                    <View key={i} style={styles.milestoneBadge}>
                      <Text style={styles.milestoneWeek}>{t('wizard.review.milestoneWeek', { week: m.targetWeek })}</Text>
                      <Text style={styles.milestoneTitle}>{m.title}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Phases */}
            {suggestedPhases.length > 0 && (
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>{t('wizard.review.phases')}</Text>
                {suggestedPhases.map((phase, i) => (
                  <View key={i} style={styles.phaseItem}>
                    <Text style={styles.phaseWeeks}>
                      {t('wizard.review.phaseWeeks', { start: phase.weekStart, end: phase.weekEnd })}
                    </Text>
                    <Text style={styles.phaseDesc}>{phase.description}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Footer */}
            <View style={styles.footer}>
              <Button title={t('wizard.back')} variant="ghost" onPress={goBack} />
              <Button
                title={t('wizard.review.createGoal')}
                onPress={createGoalAndHabits}
                disabled={isCreating || acceptedHabitsCount === 0}
                loading={isCreating}
                icon={
                  !isCreating ? (
                    <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                  ) : undefined
                }
              />
            </View>
          </View>
        )}

        {/* ============================================ */}
        {/* Step 5: Creating */}
        {/* ============================================ */}
        {step === 'creating' && (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.generatingTitle}>{t('wizard.creating.title')}</Text>
            <Text style={styles.generatingSubtitle}>{creationProgress}</Text>
          </View>
        )}

        {/* ============================================ */}
        {/* Step 6: Confirmation */}
        {/* ============================================ */}
        {step === 'confirmation' && (
          <View style={styles.centerContent}>
            <View style={styles.successCircle}>
              <Ionicons name="checkmark" size={36} color={colors.success} />
            </View>
            <Text style={styles.confirmTitle}>{t('wizard.confirmation.title')}</Text>
            <Text style={styles.confirmSubtitle}>
              {t('wizard.confirmation.subtitle', { title, count: acceptedHabitsCount })}
            </Text>
            <View style={styles.confirmStats}>
              <View style={styles.confirmStatItem}>
                <Ionicons name="flag" size={14} color={colors.textMuted} />
                <Text style={styles.confirmStatText}>{t('wizard.confirmation.weeks', { count: weeksRemaining })}</Text>
              </View>
              <View style={styles.confirmStatItem}>
                <Ionicons name="sparkles" size={14} color={colors.textMuted} />
                <Text style={styles.confirmStatText}>{t('wizard.confirmation.habits', { count: acceptedHabitsCount })}</Text>
              </View>
            </View>
            <View style={[styles.footer, { marginTop: Spacing.lg }]}>
              <Button title={t('wizard.done')} onPress={handleClose} fullWidth />
            </View>
          </View>
        )}
      </View>
    </BottomSheet>
  );
}

// ============================================
// Helpers
// ============================================

function getCategoryColor(category: HabitCategory, colors: ThemeColors): string {
  const map: Record<HabitCategory, string> = {
    health: colors.categoryHealth,
    career: colors.categoryCareer,
    mind: colors.categoryMind,
    life: colors.categoryLife,
  };
  return map[category] || colors.textMuted;
}

// ============================================
// Styles
// ============================================

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      paddingBottom: Spacing['2xl'],
    },

    // Progress
    progressRow: {
      flexDirection: 'row',
      gap: Spacing.xs,
      marginBottom: Spacing.sm,
    },
    progressDot: {
      flex: 1,
      height: 3,
      borderRadius: 2,
      backgroundColor: colors.surfaceLight,
    },
    stepDescription: {
      fontSize: FontSize.sm,
      color: colors.textMuted,
      marginBottom: Spacing.lg,
    },

    // Step content
    stepContent: {
      gap: Spacing.xs,
    },

    // Section
    sectionContainer: {
      marginTop: Spacing.md,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      marginBottom: Spacing.sm,
    },
    sectionTitle: {
      fontSize: FontSize.sm,
      fontFamily: FontFamily.bold,
      color: colors.textSecondary,
      marginBottom: Spacing.sm,
    },

    // Form
    formLabel: {
      fontSize: FontSize.sm,
      fontFamily: FontFamily.semibold,
      color: colors.textSecondary,
      marginBottom: Spacing.sm,
    },
    timelineHint: {
      fontSize: FontSize.xs,
      color: colors.textMuted,
      marginBottom: Spacing.xs,
    },
    datePickerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      backgroundColor: colors.surfaceLight,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: Spacing.xs,
    },
    datePickerText: {
      flex: 1,
      fontSize: FontSize.base,
      fontFamily: FontFamily.medium,
      color: colors.foreground,
    },
    datePickerWeeks: {
      fontSize: FontSize.xs,
      fontFamily: FontFamily.semibold,
      color: colors.textMuted,
      backgroundColor: colors.surface,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: Radius.full,
    },

    // Category grid
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

    // Level grid
    levelGrid: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    levelChip: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.xs,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceLight,
    },
    levelChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryBg,
    },
    levelLabel: {
      fontSize: FontSize.sm,
      fontFamily: FontFamily.semibold,
      color: colors.textSecondary,
    },
    levelLabelActive: {
      color: colors.primary,
    },
    levelDesc: {
      fontSize: FontSize.xs,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: 2,
    },

    // Time grid
    timeGrid: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    timeChip: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: Spacing.sm,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceLight,
    },
    timeChipActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryBg,
    },
    timeChipText: {
      fontSize: FontSize.sm,
      fontFamily: FontFamily.semibold,
      color: colors.textSecondary,
    },
    timeChipTextActive: {
      color: colors.primary,
    },

    // Loading
    loadingContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.xl,
      gap: Spacing.sm,
    },
    loadingText: {
      fontSize: FontSize.sm,
      color: colors.textMuted,
    },

    // Questions
    questionsContainer: {
      marginTop: Spacing.lg,
      gap: Spacing.lg,
    },
    questionsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    questionsHeaderText: {
      fontSize: FontSize.sm,
      color: colors.textMuted,
    },
    questionCard: {
      backgroundColor: colors.surfaceLight,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      gap: Spacing.md,
    },
    questionHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.sm,
    },
    questionNumber: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: `${colors.textMuted}20`,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    questionNumberText: {
      fontSize: FontSize.xs,
      fontFamily: FontFamily.bold,
      color: colors.textMuted,
    },
    questionText: {
      flex: 1,
      fontSize: FontSize.sm,
      fontFamily: FontFamily.semibold,
      color: colors.foreground,
      lineHeight: 20,
    },
    textAnswer: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm + 2,
      fontSize: FontSize.base,
      color: colors.foreground,
      fontFamily: FontFamily.regular,
      minHeight: 60,
      textAlignVertical: 'top',
    },
    optionsList: {
      gap: Spacing.xs,
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm + 2,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    optionRowActive: {
      borderColor: colors.primary,
      backgroundColor: `${colors.primary}10`,
    },
    optionRadio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: colors.borderStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionRadioActive: {
      borderColor: colors.primary,
    },
    optionRadioDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.primary,
    },
    optionCheckbox: {
      width: 20,
      height: 20,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.borderStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionCheckboxActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    optionRowText: {
      flex: 1,
      fontSize: FontSize.sm,
      fontFamily: FontFamily.regular,
      color: colors.textSecondary,
    },
    optionRowTextActive: {
      color: colors.foreground,
      fontFamily: FontFamily.medium,
    },

    // Warning / Error
    warningBox: {
      flexDirection: 'row',
      gap: Spacing.sm,
      padding: Spacing.md,
      borderRadius: Radius.md,
      backgroundColor: `${colors.warning}12`,
      borderWidth: 1,
      borderColor: `${colors.warning}30`,
      marginTop: Spacing.sm,
    },
    warningTitle: {
      fontSize: FontSize.sm,
      fontFamily: FontFamily.semibold,
      color: colors.warning,
      marginBottom: 2,
    },
    warningText: {
      fontSize: FontSize.sm,
      color: colors.textSecondary,
    },
    errorBox: {
      flexDirection: 'row',
      gap: Spacing.sm,
      padding: Spacing.md,
      borderRadius: Radius.md,
      backgroundColor: `${colors.danger}12`,
      borderWidth: 1,
      borderColor: `${colors.danger}30`,
      marginTop: Spacing.sm,
    },
    errorText: {
      fontSize: FontSize.sm,
      color: colors.danger,
      flex: 1,
    },

    // Center content (generating / creating / confirmation)
    centerContent: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing['3xl'],
    },
    generatingTitle: {
      fontSize: FontSize.lg,
      fontFamily: FontFamily.bold,
      color: colors.foreground,
      marginTop: Spacing.lg,
      textAlign: 'center',
    },
    generatingSubtitle: {
      fontSize: FontSize.sm,
      color: colors.textMuted,
      marginTop: Spacing.xs,
      textAlign: 'center',
    },

    // Review - Habit card
    habitCard: {
      padding: Spacing.md,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: Spacing.sm,
      gap: Spacing.xs,
    },
    habitCardAccepted: {
      borderColor: `${colors.primary}50`,
      backgroundColor: `${colors.primary}08`,
    },
    habitCardRejected: {
      opacity: 0.5,
    },
    habitHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.sm,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    checkboxChecked: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    habitName: {
      fontSize: FontSize.base,
      fontFamily: FontFamily.semibold,
      color: colors.foreground,
    },
    habitBadges: {
      flexDirection: 'row',
      gap: Spacing.xs,
      marginTop: Spacing.xs,
      alignItems: 'center',
    },
    xpBadge: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: Radius.full,
      borderWidth: 1,
      borderColor: colors.border,
    },
    xpBadgeText: {
      fontSize: FontSize.xs,
      fontFamily: FontFamily.semibold,
      color: colors.textMuted,
    },
    habitRationale: {
      fontSize: FontSize.sm,
      color: colors.textSecondary,
      lineHeight: 18,
      marginLeft: 22 + Spacing.sm,
    },
    habitImplementation: {
      fontSize: FontSize.xs,
      color: colors.primary,
      marginLeft: 22 + Spacing.sm,
    },
    habitCitation: {
      fontSize: FontSize.xs,
      color: colors.textMuted,
      fontStyle: 'italic',
      marginLeft: 22 + Spacing.sm,
    },

    // Milestones
    milestonesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: Spacing.sm,
    },
    milestoneBadge: {
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceLight,
    },
    milestoneWeek: {
      fontSize: FontSize.xs,
      fontFamily: FontFamily.bold,
      color: colors.primary,
    },
    milestoneTitle: {
      fontSize: FontSize.xs,
      color: colors.textSecondary,
      marginTop: 2,
    },

    // Phases
    phaseItem: {
      flexDirection: 'row',
      gap: Spacing.sm,
      marginBottom: Spacing.sm,
    },
    phaseWeeks: {
      fontSize: FontSize.sm,
      fontFamily: FontFamily.semibold,
      color: colors.textMuted,
      width: 80,
    },
    phaseDesc: {
      fontSize: FontSize.sm,
      color: colors.foreground,
      flex: 1,
    },

    // Confirmation
    successCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: `${colors.success}20`,
      alignItems: 'center',
      justifyContent: 'center',
      ...Shadows.glow(colors.success, 0.3),
    },
    confirmTitle: {
      fontSize: FontSize.xl,
      fontFamily: FontFamily.bold,
      color: colors.foreground,
      marginTop: Spacing.lg,
    },
    confirmSubtitle: {
      fontSize: FontSize.sm,
      color: colors.textMuted,
      marginTop: Spacing.xs,
      textAlign: 'center',
    },
    confirmStats: {
      flexDirection: 'row',
      gap: Spacing.lg,
      marginTop: Spacing.md,
    },
    confirmStatItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    confirmStatText: {
      fontSize: FontSize.sm,
      color: colors.textMuted,
    },

    // Footer
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: Spacing.xl,
      paddingTop: Spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
  });
