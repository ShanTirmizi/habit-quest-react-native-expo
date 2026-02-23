import React, { useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ReAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { Colors, FontSize, Spacing, Radius } from '@/constants/theme';
import { CATEGORY_COLORS, CATEGORY_BG_COLORS } from '@/constants/theme';
import type { Habit, HabitCategory, TimeOfDay } from '@/types';
import { BadgePill } from '@/components/ui/BadgePill';

interface HabitCardProps {
  habit: Habit;
  isCompleted: boolean;
  onToggle: (id: string) => void;
  onPress?: (habit: Habit) => void;
}

const TIME_ICON_NAMES: Record<TimeOfDay, keyof typeof Ionicons.glyphMap | null> = {
  morning: 'sunny-outline',
  afternoon: 'partly-sunny-outline',
  evening: 'moon-outline',
  anytime: null,
};

const SWIPE_THRESHOLD = 70;

export function HabitCard({ habit, isCompleted, onToggle, onPress }: HabitCardProps) {
  const categoryColor = CATEGORY_COLORS[habit.category] || Colors.textSecondary;
  const categoryBg = CATEGORY_BG_COLORS[habit.category] || Colors.surfaceLight;
  const checkboxScale = useRef(new Animated.Value(1)).current;

  // Swipe-to-complete
  const translateX = useSharedValue(0);

  const triggerComplete = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onToggle(habit.id);
  }, [habit.id, onToggle]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([10, 0])
    .enabled(!isCompleted)
    .onUpdate((event) => {
      const x = Math.max(0, Math.min(event.translationX, 100));
      translateX.value = x;
    })
    .onEnd((event) => {
      if (event.translationX > SWIPE_THRESHOLD) {
        translateX.value = withSpring(0, { damping: 15, stiffness: 200 });
        runOnJS(triggerComplete)();
      } else {
        translateX.value = withSpring(0, { damping: 15, stiffness: 200 });
      }
    });

  const swipeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const revealStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1]),
  }));

  const handleToggle = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.spring(checkboxScale, { toValue: 0.85, useNativeDriver: true, speed: 50, bounciness: 0 }),
      Animated.spring(checkboxScale, { toValue: 1.15, useNativeDriver: true, speed: 50, bounciness: 0 }),
      Animated.spring(checkboxScale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 0 }),
    ]).start();
    onToggle(habit.id);
  }, [habit.id, onToggle, checkboxScale]);

  const handlePress = useCallback(() => {
    if (onPress) {
      Haptics.selectionAsync();
      onPress(habit);
    }
  }, [habit, onPress]);

  return (
    <View style={styles.swipeContainer}>
      {/* Green reveal behind */}
      <ReAnimated.View style={[styles.revealBg, revealStyle]}>
        <Ionicons name="checkmark-circle" size={28} color="#fff" />
      </ReAnimated.View>

      <GestureDetector gesture={panGesture}>
        <ReAnimated.View style={swipeStyle}>
          <Pressable
            onPress={handlePress}
            style={({ pressed }) => [
              styles.card,
              { borderLeftColor: categoryColor },
              pressed && styles.cardPressed,
            ]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isCompleted }}
            accessibilityLabel={`${habit.name}, ${habit.category}, ${habit.xpReward} XP${isCompleted ? ', completed' : ''}`}
          >
            <Animated.View style={{ transform: [{ scale: checkboxScale }] }}>
              <Pressable
                onPress={handleToggle}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.checkbox,
                  isCompleted && { backgroundColor: categoryColor, borderColor: categoryColor },
                  !isCompleted && { borderColor: Colors.border },
                  pressed && { transform: [{ scale: 0.9 }] },
                ]}
              >
                {isCompleted ? (
                  <Ionicons name="checkmark" size={14} color={Colors.background} />
                ) : null}
              </Pressable>
            </Animated.View>

            <View style={styles.content}>
              <Text
                style={[styles.name, isCompleted && styles.nameCompleted]}
                numberOfLines={1}
              >
                {habit.name}
              </Text>

              <View style={styles.metaRow}>
                <BadgePill
                  label={habit.category.charAt(0).toUpperCase() + habit.category.slice(1)}
                  color={categoryColor}
                  bgColor={categoryBg}
                  size="sm"
                />
                <Text style={styles.xp}>+{habit.xpReward} XP</Text>
                {habit.streak > 0 ? (
                  <View style={styles.streakBadge}>
                    <Ionicons name="flame" size={12} color={Colors.accent} />
                    <Text style={styles.streakText}>{habit.streak}</Text>
                  </View>
                ) : null}
                {habit.notes && habit.notes.length > 0 ? (
                  <Ionicons name="chatbubble-outline" size={12} color={Colors.textDim} />
                ) : null}
              </View>
            </View>

            <View style={styles.rightSection}>
              {habit.timeOfDay && TIME_ICON_NAMES[habit.timeOfDay] ? (
                <Ionicons name={TIME_ICON_NAMES[habit.timeOfDay]!} size={16} color={Colors.textDim} />
              ) : null}
              <Ionicons name="chevron-forward" size={16} color={Colors.textDim} />
            </View>
          </Pressable>
        </ReAnimated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  swipeContainer: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: Radius.lg,
  },
  revealBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.success,
    borderRadius: Radius.lg,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingLeft: Spacing.xl,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderLeftWidth: 3,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  cardPressed: {
    backgroundColor: Colors.surfaceHover,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.foreground,
    flex: 1,
  },
  nameCompleted: {
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  xp: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: '600',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  streakText: {
    fontSize: FontSize.xs,
    color: Colors.accent,
    fontWeight: '700',
  },
});
