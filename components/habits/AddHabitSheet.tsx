import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { FontSize, Spacing, Radius, FontFamily, getCategoryColors, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { BottomSheet, BottomSheetTextInput } from '@/components/ui/BottomSheet';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useTranslation } from 'react-i18next';
import type { Habit, HabitCategory, HabitFrequencyType, TimeOfDay } from '@/types';

interface AddHabitSheetProps {
  visible: boolean;
  onClose: () => void;
  existingHabits?: Habit[];
  onAdd: (habit: {
    name: string;
    category: HabitCategory;
    xpReward: number;
    frequency?: { type: HabitFrequencyType; daysOfWeek?: number[]; timesPerWeek?: number };
    timeOfDay?: TimeOfDay;
    location?: string;
    trigger?: string;
    chainedToHabitId?: string;
    rewardBundle?: string;
  }) => void;
}

const CATEGORIES: { value: HabitCategory; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'health', label: 'Health', icon: 'heart-outline' },
  { value: 'career', label: 'Career', icon: 'briefcase-outline' },
  { value: 'mind', label: 'Mind', icon: 'bulb-outline' },
  { value: 'life', label: 'Life', icon: 'sunny-outline' },
];

const FREQUENCIES: { value: HabitFrequencyType; label: string }[] = [
  { value: 'daily', label: 'Every day' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekends', label: 'Weekends' },
  { value: 'custom', label: 'Custom' },
  { value: 'timesPerWeek', label: 'X per week' },
];

const TIME_OF_DAY: { value: TimeOfDay; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'morning', label: 'Morning', icon: 'sunny-outline' },
  { value: 'afternoon', label: 'Afternoon', icon: 'partly-sunny-outline' },
  { value: 'evening', label: 'Evening', icon: 'moon-outline' },
  { value: 'anytime', label: 'Anytime', icon: 'time-outline' },
];

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const XP_OPTIONS = [10, 15, 20, 25];

export function AddHabitSheet({ visible, onClose, onAdd, existingHabits }: AddHabitSheetProps) {
  const { t } = useTranslation('habits');
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const categoryColors = useMemo(() => getCategoryColors(colors), [colors]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<HabitCategory>('health');
  const [xpReward, setXpReward] = useState(15);
  const [frequencyType, setFrequencyType] = useState<HabitFrequencyType>('daily');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [timesPerWeek, setTimesPerWeek] = useState(3);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('anytime');
  const [location, setLocation] = useState('');
  const [trigger, setTrigger] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [chainedToHabitId, setChainedToHabitId] = useState<string | undefined>(undefined);
  const [showChainPicker, setShowChainPicker] = useState(false);
  const [rewardBundle, setRewardBundle] = useState('');

  const resetForm = useCallback(() => {
    setName('');
    setCategory('health');
    setXpReward(15);
    setFrequencyType('daily');
    setSelectedDays([]);
    setTimesPerWeek(3);
    setTimeOfDay('anytime');
    setLocation('');
    setTrigger('');
    setShowAdvanced(false);
    setChainedToHabitId(undefined);
    setShowChainPicker(false);
    setRewardBundle('');
  }, []);

  const handleAdd = useCallback(() => {
    if (!name.trim()) return;

    const frequency: { type: HabitFrequencyType; daysOfWeek?: number[]; timesPerWeek?: number } = {
      type: frequencyType,
    };
    if (frequencyType === 'custom') {
      frequency.daysOfWeek = selectedDays;
    } else if (frequencyType === 'timesPerWeek') {
      frequency.timesPerWeek = timesPerWeek;
    }

    onAdd({
      name: name.trim(),
      category,
      xpReward,
      frequency,
      timeOfDay,
      location: location.trim() || undefined,
      trigger: trigger.trim() || undefined,
      chainedToHabitId,
      rewardBundle: rewardBundle.trim() || undefined,
    });

    resetForm();
    onClose();
  }, [name, category, xpReward, frequencyType, selectedDays, timesPerWeek, timeOfDay, location, trigger, chainedToHabitId, rewardBundle, onAdd, onClose, resetForm]);

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('sheetTitle')}>
      <View style={styles.form}>
        <Input
          label={t('habitName.label')}
          value={name}
          onChangeText={setName}
          placeholder={t('habitName.placeholder')}
          bottomSheet
        />

        {/* Category */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('category.label')}</Text>
          <View style={styles.optionRow}>
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat.value}
                onPress={() => { Haptics.selectionAsync(); setCategory(cat.value); }}
                style={[
                  styles.categoryChip,
                  category === cat.value && {
                    backgroundColor: `${categoryColors[cat.value]}20`,
                    borderColor: categoryColors[cat.value],
                  },
                ]}
              >
                <Ionicons name={cat.icon} size={14} color={category === cat.value ? categoryColors[cat.value] : colors.textSecondary} />
                <Text
                  style={[
                    styles.chipLabel,
                    category === cat.value && {
                      color: categoryColors[cat.value],
                    },
                  ]}
                >
                  {t(`category.${cat.value}`)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* XP Reward */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('xpReward.label')}</Text>
          <View style={styles.optionRow}>
            {XP_OPTIONS.map((xp) => (
              <Pressable
                key={xp}
                onPress={() => { Haptics.selectionAsync(); setXpReward(xp); }}
                style={[
                  styles.xpChip,
                  xpReward === xp && styles.xpChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.xpChipText,
                    xpReward === xp && styles.xpChipTextActive,
                  ]}
                >
                  {t('xpReward.value', { xp })}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Frequency */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('frequency.label')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.optionRow}>
              {FREQUENCIES.map((freq) => (
                <Pressable
                  key={freq.value}
                  onPress={() => { Haptics.selectionAsync(); setFrequencyType(freq.value); }}
                  style={[
                    styles.freqChip,
                    frequencyType === freq.value && styles.freqChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.freqChipText,
                      frequencyType === freq.value && styles.freqChipTextActive,
                    ]}
                  >
                    {t(`frequency.${freq.value}`)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {/* Custom Days */}
          {frequencyType === 'custom' ? (
            <View style={styles.daysRow}>
              {DAYS.map((day, i) => (
                <Pressable
                  key={i}
                  onPress={() => toggleDay(i)}
                  style={[
                    styles.dayChip,
                    selectedDays.includes(i) && styles.dayChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      selectedDays.includes(i) && styles.dayTextActive,
                    ]}
                  >
                    {day}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        {/* Time of Day */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t('timeOfDay.label')}</Text>
          <View style={styles.optionRow}>
            {TIME_OF_DAY.map((tod) => (
              <Pressable
                key={tod.value}
                onPress={() => { Haptics.selectionAsync(); setTimeOfDay(tod.value); }}
                style={[
                  styles.todChip,
                  timeOfDay === tod.value && styles.todChipActive,
                ]}
              >
                <Ionicons name={tod.icon} size={14} color={timeOfDay === tod.value ? colors.primary : colors.textSecondary} />
                <Text
                  style={[
                    styles.todLabel,
                    timeOfDay === tod.value && styles.todLabelActive,
                  ]}
                >
                  {t(`timeOfDay.${tod.value}`)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Chain After (Habit Stacking) */}
        {existingHabits && existingHabits.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.chainHeader}>
              <Ionicons name="link-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.sectionLabel}>{t('chainAfter.label')}</Text>
            </View>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setShowChainPicker(!showChainPicker);
              }}
              style={[styles.chainSelector, chainedToHabitId && styles.chainSelectorActive]}
            >
              <Text
                style={[
                  styles.chainSelectorText,
                  chainedToHabitId && { color: colors.foreground },
                ]}
                numberOfLines={1}
              >
                {chainedToHabitId
                  ? t('chainAfter.selected', { name: existingHabits.find((h) => h.id === chainedToHabitId)?.name || t('chainAfter.unknownName') })
                  : t('chainAfter.none')}
              </Text>
              <Ionicons
                name={showChainPicker ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={colors.textMuted}
              />
            </Pressable>

            {showChainPicker ? (
              <View style={styles.chainList}>
                {/* None option */}
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
                    setChainedToHabitId(undefined);
                    setShowChainPicker(false);
                  }}
                  style={[styles.chainOption, !chainedToHabitId && styles.chainOptionActive]}
                >
                  <View style={[styles.chainRadio, !chainedToHabitId && styles.chainRadioActive]}>
                    {!chainedToHabitId ? <View style={styles.chainRadioDot} /> : null}
                  </View>
                  <Text style={[styles.chainOptionText, !chainedToHabitId && { color: colors.foreground }]}>
                    {t('chainAfter.none')}
                  </Text>
                </Pressable>

                {existingHabits.map((h) => {
                  const isSelected = chainedToHabitId === h.id;
                  return (
                    <Pressable
                      key={h.id}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setChainedToHabitId(h.id);
                        setShowChainPicker(false);
                      }}
                      style={[styles.chainOption, isSelected && styles.chainOptionActive]}
                    >
                      <View style={[styles.chainRadio, isSelected && styles.chainRadioActive]}>
                        {isSelected ? <View style={styles.chainRadioDot} /> : null}
                      </View>
                      <View style={styles.chainOptionContent}>
                        <Text style={[styles.chainOptionText, isSelected && { color: colors.foreground }]} numberOfLines={1}>
                          {h.name}
                        </Text>
                        {h.timeOfDay && h.timeOfDay !== 'anytime' ? (
                          <Text style={styles.chainOptionMeta}>{h.timeOfDay}</Text>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            <Text style={styles.chainHint}>
              {t('chainAfter.hint')}
            </Text>
          </View>
        ) : null}

        {/* If-Then Blueprint + Reward Bundle */}
        <Pressable
          onPress={() => setShowAdvanced(!showAdvanced)}
          style={styles.advancedToggle}
        >
          <View style={styles.advancedToggleLeft}>
            <Ionicons name="flash-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.advancedText}>{t('supercharge.label')}</Text>
          </View>
          <Ionicons
            name={showAdvanced ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.textSecondary}
          />
        </Pressable>

        {showAdvanced ? (
          <View style={styles.advancedSection}>
            {/* If-Then Blueprint */}
            <View style={styles.blueprintBuilder}>
              <Text style={styles.blueprintSectionLabel}>{t('supercharge.ifThen.label')}</Text>
              <View style={styles.blueprintField}>
                <Text style={styles.blueprintKeyword}>{t('supercharge.ifThen.if')}</Text>
                <BottomSheetTextInput
                  style={styles.blueprintInput}
                  value={trigger}
                  onChangeText={setTrigger}
                  placeholder={t('supercharge.ifThen.triggerPlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  selectionColor={colors.primary}
                />
              </View>
              <View style={styles.blueprintField}>
                <Text style={[styles.blueprintKeyword, { color: colors.success }]}>{t('supercharge.ifThen.then')}</Text>
                <Text style={styles.blueprintHabitName} numberOfLines={1}>
                  {name || t('supercharge.ifThen.yourHabit')}
                </Text>
              </View>
              <View style={styles.blueprintField}>
                <Text style={[styles.blueprintKeyword, { color: colors.info }]}>{t('supercharge.ifThen.at')}</Text>
                <BottomSheetTextInput
                  style={styles.blueprintInput}
                  value={location}
                  onChangeText={setLocation}
                  placeholder={t('supercharge.ifThen.locationPlaceholder')}
                  placeholderTextColor={colors.textMuted}
                  selectionColor={colors.primary}
                />
              </View>
              <Text style={styles.intentionHint}>
                {t('supercharge.ifThen.hint')}
              </Text>
            </View>

            {/* Temptation Bundle */}
            <View style={styles.bundleSection}>
              <View style={styles.bundleLabelRow}>
                <Ionicons name="gift-outline" size={14} color={colors.accent} />
                <Text style={styles.blueprintSectionLabel}>{t('supercharge.reward.label')}</Text>
              </View>
              <BottomSheetTextInput
                style={styles.bundleInput}
                value={rewardBundle}
                onChangeText={setRewardBundle}
                placeholder={t('supercharge.reward.placeholder')}
                placeholderTextColor={colors.textMuted}
                selectionColor={colors.primary}
              />
              <Text style={styles.intentionHint}>
                {t('supercharge.reward.hint')}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Submit */}
        <View style={styles.footer}>
          <Button
            title={t('button.cancel')}
            variant="ghost"
            onPress={() => {
              resetForm();
              onClose();
            }}
          />
          <Button
            title={t('button.create')}
            onPress={handleAdd}
            disabled={!name.trim()}
          />
        </View>
      </View>
    </BottomSheet>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  form: {
    gap: Spacing.lg,
    paddingBottom: Spacing['2xl'],
  },
  section: {
    gap: Spacing.sm,
  },
  sectionLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semibold,
    color: colors.textSecondary,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLight,
    gap: 6,
  },
  chipIcon: {
    width: 14,
  },
  chipLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.medium,
    color: colors.textSecondary,
  },
  xpChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLight,
  },
  xpChipActive: {
    backgroundColor: colors.primaryBg,
    borderColor: colors.primary,
  },
  xpChipText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semibold,
    color: colors.textSecondary,
  },
  xpChipTextActive: {
    color: colors.primary,
  },
  freqChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLight,
  },
  freqChipActive: {
    backgroundColor: colors.primaryBg,
    borderColor: colors.primary,
  },
  freqChipText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.medium,
    color: colors.textSecondary,
  },
  freqChipTextActive: {
    color: colors.primary,
  },
  daysRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  dayChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayChipActive: {
    backgroundColor: colors.primaryBg,
    borderColor: colors.primary,
  },
  dayText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semibold,
    color: colors.textSecondary,
  },
  dayTextActive: {
    color: colors.primary,
  },
  todChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLight,
    gap: 4,
  },
  todChipActive: {
    backgroundColor: colors.primaryBg,
    borderColor: colors.primary,
  },
  todIcon: {
    width: 14,
  },
  todLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.medium,
    color: colors.textSecondary,
  },
  todLabelActive: {
    color: colors.primary,
  },
  chainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  chainSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLight,
  },
  chainSelectorActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  chainSelectorText: {
    flex: 1,
    fontSize: FontSize.sm,
    fontFamily: FontFamily.medium,
    color: colors.textMuted,
  },
  chainList: {
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  chainOption: {
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
  chainOptionActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  chainRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chainRadioActive: {
    borderColor: colors.primary,
  },
  chainRadioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  chainOptionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  chainOptionText: {
    flex: 1,
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: colors.textSecondary,
  },
  chainOptionMeta: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.medium,
    color: colors.textMuted,
    textTransform: 'capitalize',
  },
  chainHint: {
    fontSize: FontSize.xs,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  advancedToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  advancedText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semibold,
    color: colors.textSecondary,
  },
  advancedSection: {
    paddingBottom: Spacing.sm,
    gap: Spacing.lg,
  },
  blueprintBuilder: {
    gap: Spacing.sm,
  },
  blueprintSectionLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semibold,
    color: colors.textSecondary,
  },
  blueprintField: {
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
  blueprintInput: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: colors.foreground,
  },
  blueprintHabitName: {
    flex: 1,
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semibold,
    color: colors.foreground,
    paddingVertical: Spacing.sm,
  },
  intentionHint: {
    fontSize: FontSize.xs,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },
  bundleSection: {
    gap: Spacing.sm,
  },
  bundleLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  bundleInput: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: colors.foreground,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
});
