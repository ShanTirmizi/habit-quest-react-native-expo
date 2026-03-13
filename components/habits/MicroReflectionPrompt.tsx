import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ReAnimated, { FadeIn, FadeOut, SlideInDown } from 'react-native-reanimated';
import { FontSize, Spacing, Radius, FontFamily, Shadows, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import type { ReflectionMood } from '@/types';
import { REFLECTION_MOOD_CONFIG } from '@/types';

interface MicroReflectionPromptProps {
  habitName: string;
  onSelect: (mood: ReflectionMood) => void;
  onDismiss: () => void;
}

const MOODS: ReflectionMood[] = ['energized', 'good', 'meh', 'tough'];

export function MicroReflectionPrompt({ habitName, onSelect, onDismiss }: MicroReflectionPromptProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ReAnimated.View
      entering={SlideInDown.duration(300).springify()}
      exiting={FadeOut.duration(200)}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.title}>How did that feel?</Text>
        <Pressable onPress={onDismiss} hitSlop={8}>
          <Ionicons name="close" size={16} color={colors.textMuted} />
        </Pressable>
      </View>

      <View style={styles.moodRow}>
        {MOODS.map((mood) => {
          const config = REFLECTION_MOOD_CONFIG[mood];
          return (
            <Pressable
              key={mood}
              onPress={() => onSelect(mood)}
              style={({ pressed }) => [
                styles.moodButton,
                { borderColor: `${config.color}30` },
                pressed && { backgroundColor: `${config.color}15`, transform: [{ scale: 0.95 }] },
              ]}
            >
              <Ionicons name={config.icon as any} size={20} color={config.color} />
              <Text style={[styles.moodLabel, { color: config.color }]}>{config.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </ReAnimated.View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: Spacing.md,
    gap: Spacing.sm,
    ...Shadows.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semibold,
    color: colors.foreground,
  },
  moodRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  moodButton: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  moodLabel: {
    fontSize: 10,
    fontFamily: FontFamily.semibold,
  },
});
