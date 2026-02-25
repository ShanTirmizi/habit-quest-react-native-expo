import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontSize, Spacing, Radius, FontFamily, getCategoryColors, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { HabitCategory, HabitFrequencyType, TimeOfDay } from '@/types';

interface AddHabitSheetProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (habit: {
    name: string;
    category: HabitCategory;
    xpReward: number;
    frequency?: { type: HabitFrequencyType; daysOfWeek?: number[]; timesPerWeek?: number };
    timeOfDay?: TimeOfDay;
    location?: string;
    trigger?: string;
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

export function AddHabitSheet({ visible, onClose, onAdd }: AddHabitSheetProps) {
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
          autoFocus
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

        {/* Advanced Settings */}
        <Pressable
          onPress={() => setShowAdvanced(!showAdvanced)}
          style={styles.advancedToggle}
        >
          <Text style={styles.advancedText}>Implementation Intentions</Text>
          <Ionicons
            name={showAdvanced ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.textSecondary}
          />
        </Pressable>

        {showAdvanced ? (
          <View style={styles.advancedSection}>
            <Input
              label="Location (Where?)"
              value={location}
              onChangeText={setLocation}
              placeholder="e.g., At my desk, In the gym..."
            />
            <Input
              label="Trigger (After what?)"
              value={trigger}
              onChangeText={setTrigger}
              placeholder="e.g., After morning coffee..."
              containerStyle={{ marginTop: Spacing.md }}
            />
            <Text style={styles.intentionHint}>
              Research shows stating when & where increases success by 2x
            </Text>
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
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  advancedText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semibold,
    color: colors.textSecondary,
  },
  advancedSection: {
    paddingBottom: Spacing.sm,
  },
  intentionHint: {
    fontSize: FontSize.xs,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: Spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
});
