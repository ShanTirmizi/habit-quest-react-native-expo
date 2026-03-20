import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  FontSize,
  Spacing,
  Radius,
  FontFamily,
  Shadows,
  getCategoryColors,
  getCategoryCardColors,
  type ThemeColors,
} from '@/constants/theme';
import type { Habit } from '@/types';

interface ChainPreviewProps {
  chainHabits: Habit[];
  completedIds: Set<string>;
  colors: ThemeColors;
  isDark: boolean;
  parentCategory?: string;
  onPressHabit?: (habit: Habit) => void;
}

export function ChainPreview({ chainHabits, completedIds, colors, isDark, parentCategory, onPressHabit }: ChainPreviewProps) {
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const categoryColors = useMemo(() => getCategoryColors(colors), [colors]);
  const categoryCardColors = useMemo(() => getCategoryCardColors(colors), [colors]);

  if (chainHabits.length === 0) return null;

  // Use parent's card color for a cohesive look, with reduced opacity
  const parentCardBg = parentCategory
    ? categoryCardColors[parentCategory] || colors.surface
    : colors.surface;

  return (
    <View style={[styles.container, { backgroundColor: isDark ? colors.surfaceLight : `${parentCardBg}90` }]}>
      {/* "Up next" label */}
      <View style={styles.headerRow}>
        <View style={[styles.headerLine, { backgroundColor: isDark ? colors.borderStrong : 'rgba(255,255,255,0.25)' }]} />
        <Text style={[styles.headerText, { color: isDark ? colors.textMuted : 'rgba(255,255,255,0.6)' }]}>
          Up next
        </Text>
        <View style={[styles.headerLine, { backgroundColor: isDark ? colors.borderStrong : 'rgba(255,255,255,0.25)' }]} />
      </View>

      {chainHabits.map((habit, index) => {
        const isComplete = completedIds.has(habit.id);
        const catColor = categoryColors[habit.category] || colors.textSecondary;
        const isLast = index === chainHabits.length - 1;

        return (
          <View key={habit.id} style={styles.row}>
            {/* Connector line + dot */}
            <View style={styles.connectorCol}>
              {index === 0 ? (
                <View style={[styles.lineSegment, { backgroundColor: isDark ? colors.borderStrong : 'rgba(255,255,255,0.25)' }]} />
              ) : (
                <View style={[styles.lineSegment, { backgroundColor: isDark ? colors.borderStrong : 'rgba(255,255,255,0.25)' }]} />
              )}
              <View style={[styles.dot, { backgroundColor: catColor, borderWidth: 2, borderColor: isDark ? colors.surfaceLight : 'rgba(255,255,255,0.3)' }]} />
              {!isLast ? (
                <View style={[styles.lineSegmentBottom, { backgroundColor: isDark ? colors.borderStrong : 'rgba(255,255,255,0.25)' }]} />
              ) : (
                <View style={styles.lineSegmentBottom} />
              )}
            </View>

            {/* Habit info */}
            <Pressable
              onPress={() => {
                if (onPressHabit) {
                  Haptics.selectionAsync();
                  onPressHabit(habit);
                }
              }}
              style={({ pressed }) => [
                styles.miniCard,
                { backgroundColor: isDark ? `${colors.surface}80` : 'rgba(255,255,255,0.15)' },
                isComplete && styles.miniCardCompleted,
                pressed && styles.miniCardPressed,
              ]}
            >
              {isComplete ? (
                <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              ) : (
                <View style={[styles.miniCheckbox, { borderColor: isDark ? colors.borderStrong : 'rgba(255,255,255,0.4)' }]} />
              )}
              <Text
                style={[
                  styles.habitName,
                  { color: isDark ? colors.foreground : 'rgba(255,255,255,0.85)' },
                  isComplete && styles.habitNameCompleted,
                ]}
                numberOfLines={1}
              >
                {habit.name}
              </Text>
              <Ionicons name="chevron-forward" size={12} color={isDark ? colors.textMuted : 'rgba(255,255,255,0.4)'} />
              <Text style={[styles.xpText, { color: isDark ? colors.textMuted : 'rgba(255,255,255,0.5)' }]}>
                +{habit.xpReward} XP
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const createStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    container: {
      marginHorizontal: 0,
      paddingHorizontal: Spacing.md,
      paddingBottom: Spacing.md,
      paddingTop: 0,
      borderBottomLeftRadius: 18,
      borderBottomRightRadius: 18,
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
      marginTop: 0, // Sits flush against card (card removes its bottom margin when expanded)
      marginBottom: 10, // Take over the card's normal bottom spacing
      borderWidth: isDark ? 1 : 0,
      borderTopWidth: 0,
      borderColor: colors.borderStrong,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingVertical: 8,
      paddingHorizontal: 4,
    },
    headerLine: {
      flex: 1,
      height: 1,
    },
    headerText: {
      fontSize: 10,
      fontFamily: FontFamily.semibold,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 40,
    },
    connectorCol: {
      width: 24,
      alignItems: 'center',
      alignSelf: 'stretch',
    },
    lineSegment: {
      width: 2,
      flex: 1,
      minHeight: 4,
      borderRadius: 1,
    },
    lineSegmentBottom: {
      width: 2,
      flex: 1,
      minHeight: 4,
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    miniCard: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingVertical: 8,
      paddingHorizontal: Spacing.md - 2,
      borderRadius: 12,
      marginLeft: 4,
    },
    miniCardCompleted: {
      opacity: 0.5,
    },
    miniCardPressed: {
      opacity: 0.7,
    },
    miniCheckbox: {
      width: 16,
      height: 16,
      borderRadius: 8,
      borderWidth: 1.5,
    },
    habitName: {
      fontSize: FontSize.sm,
      fontFamily: FontFamily.medium,
      flex: 1,
    },
    habitNameCompleted: {
      textDecorationLine: 'line-through',
    },
    xpText: {
      fontSize: FontSize.xs,
      fontFamily: FontFamily.bold,
    },
  });
