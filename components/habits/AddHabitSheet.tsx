import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { BottomSheetTextInput as TextInput } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { FontSize, Spacing, Radius, FontFamily, getCategoryColors, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
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
  }, [name, category, xpReward, frequencyType, selectedDays, timesPerWeek, timeOfDay, location, trigger, onAdd, onClose, resetForm]);

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="New Habit">
      <View style={styles.form}>
        <Input
          label="Habit Name"
          value={name}
          onChangeText={setName}
          placeholder="e.g., Morning run, Read 30 minutes..."
          bottomSheet
        />

        {/* Category */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Category</Text>
          <View style={styles.optionRow}>
            {CATEGORIES.map((cat) => (
              <Pressable
                key={cat.value}
                onPress={() => setCategory(cat.value)}
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
                  {cat.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* XP Reward */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>XP Reward</Text>
          <View style={styles.optionRow}>
            {XP_OPTIONS.map((xp) => (
              <Pressable
                key={xp}
                onPress={() => setXpReward(xp)}
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
                  {xp} XP
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Frequency */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Frequency</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.optionRow}>
              {FREQUENCIES.map((freq) => (
                <Pressable
                  key={freq.value}
                  onPress={() => setFrequencyType(freq.value)}
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
                    {freq.label}
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
          <Text style={styles.sectionLabel}>Time of Day</Text>
          <View style={styles.optionRow}>
            {TIME_OF_DAY.map((tod) => (
              <Pressable
                key={tod.value}
                onPress={() => setTimeOfDay(tod.value)}
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
                  {tod.label}
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
              <Text style={styles.sectionLabel}>Chain After</Text>
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
                  ? `After: ${existingHabits.find((h) => h.id === chainedToHabitId)?.name || 'Unknown'}`
                  : 'None — standalone habit'}
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
                    None — standalone habit
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
              Habit stacking: do this right after another habit
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
            <Text style={styles.advancedText}>Supercharge</Text>
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
              <Text style={styles.blueprintSectionLabel}>If-Then Blueprint</Text>
              <View style={styles.blueprintField}>
                <Text style={styles.blueprintKeyword}>IF</Text>
                <TextInput
                  style={styles.blueprintInput}
                  value={trigger}
                  onChangeText={setTrigger}
                  placeholder="After morning coffee..."
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={styles.blueprintField}>
                <Text style={[styles.blueprintKeyword, { color: colors.success }]}>THEN</Text>
                <Text style={styles.blueprintHabitName} numberOfLines={1}>
                  {name || 'Your habit'}
                </Text>
              </View>
              <View style={styles.blueprintField}>
                <Text style={[styles.blueprintKeyword, { color: colors.info }]}>AT</Text>
                <TextInput
                  style={styles.blueprintInput}
                  value={location}
                  onChangeText={setLocation}
                  placeholder="In the gym, at my desk..."
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <Text style={styles.intentionHint}>
                If-then plans increase follow-through by 2-3x (Gollwitzer, 1999)
              </Text>
            </View>

            {/* Temptation Bundle */}
            <View style={styles.bundleSection}>
              <View style={styles.bundleLabelRow}>
                <Ionicons name="gift-outline" size={14} color={colors.accent} />
                <Text style={styles.blueprintSectionLabel}>Reward Bundle</Text>
              </View>
              <TextInput
                style={styles.bundleInput}
                value={rewardBundle}
                onChangeText={setRewardBundle}
                placeholder="e.g., Listen to podcast, watch a show..."
                placeholderTextColor={colors.textMuted}
              />
              <Text style={styles.intentionHint}>
                Pair this habit with a reward you enjoy (Milkman, 2014)
              </Text>
            </View>
          </View>
        ) : null}

        {/* Submit */}
        <View style={styles.footer}>
          <Button
            title="Cancel"
            variant="ghost"
            onPress={() => {
              resetForm();
              onClose();
            }}
          />
          <Button
            title="Create Habit"
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
