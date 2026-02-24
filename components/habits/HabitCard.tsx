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
import { LinearGradient } from 'expo-linear-gradient';
import {
  Colors,
  FontSize,
  Spacing,
  Radius,
  FontFamily,
  Shadows,
  CATEGORY_COLORS,
  CATEGORY_BG_COLORS,
  CATEGORY_GRADIENTS,
} from '@/constants/theme';
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
  const categoryGradient = CATEGORY_GRADIENTS[habit.category] || [Colors.textDim, Colors.textDim];
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
      {/* Gradient reveal behind card on swipe */}
      <ReAnimated.View style={[styles.revealBgWrapper, revealStyle]}>
        <LinearGradient
          colors={['#00E676', '#00A152']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.revealBg}
        >
          <Ionicons name="checkmark-circle" size={28} color="#fff" />
        </LinearGradient>
      </ReAnimated.View>

      <GestureDetector gesture={panGesture}>
        <ReAnimated.View style={swipeStyle}>
          <Pressable
            onPress={handlePress}
            style={({ pressed }) => [
              styles.card,
              isCompleted && styles.cardCompleted,
              pressed && styles.cardPressed,
            ]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isCompleted }}
            accessibilityLabel={`${habit.name}, ${habit.category}, ${habit.xpReward} XP${isCompleted ? ', completed' : ''}`}
          >
            {/* Category gradient left strip */}
            {isCompleted ? (
              <View style={[styles.gradientStrip, { backgroundColor: Colors.textDim }]} />
            ) : (
              <LinearGradient
                colors={categoryGradient}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.gradientStrip}
              />
            )}

            {/* Main content row — padded left to clear the strip */}
            <View style={styles.contentRow}>
              {/* Circular animated checkbox */}
              <Animated.View style={{ transform: [{ scale: checkboxScale }] }}>
                <Pressable
                  onPress={handleToggle}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.checkbox,
                    isCompleted && { backgroundColor: categoryColor, borderColor: categoryColor },
                    !isCompleted && { borderColor: Colors.borderStrong },
                    pressed && { transform: [{ scale: 0.9 }] },
                  ]}
                >
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={15} color="#fff" />
                  ) : null}
                </Pressable>
              </Animated.View>

              {/* Text content */}
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
                  {habit.timeOfDay && TIME_ICON_NAMES[habit.timeOfDay] ? (
                    <Ionicons
                      name={TIME_ICON_NAMES[habit.timeOfDay]!}
                      size={13}
                      color={Colors.textSecondary}
                    />
                  ) : null}
                  {habit.notes && habit.notes.length > 0 ? (
                    <Ionicons name="chatbubble-outline" size={12} color={Colors.textSecondary} />
                  ) : null}
                </View>
              </View>
            </View>

            {/* XP pill — top-right corner */}
            <View style={styles.xpPill}>
              <Text style={styles.xpPillText}>+{habit.xpReward} XP</Text>
            </View>
          </Pressable>

          {/* Floating streak badge — overlaps bottom-right of card */}
          {habit.streak > 0 ? (
            <View style={styles.streakFloat}>
              <Ionicons name="flame" size={11} color={Colors.accent} />
              <Text style={styles.streakFloatText}>{habit.streak}</Text>
            </View>
          ) : null}
        </ReAnimated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  swipeContainer: {
    position: 'relative',
    overflow: 'visible',
    borderRadius: Radius.xl,
    marginBottom: 6,
  },
  revealBgWrapper: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  revealBg: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingLeft: Spacing.xl,
  },
  card: {
    position: 'relative',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    overflow: 'hidden',
    ...Shadows.card,
  },
  cardCompleted: {
    opacity: 0.5,
  },
  cardPressed: {
    backgroundColor: Colors.surfaceHover,
  },
  gradientStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: Radius.xl,
    borderBottomLeftRadius: Radius.xl,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    gap: Spacing.md,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 4,
    paddingRight: 60,
  },
  name: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.semibold,
    color: Colors.foreground,
  },
  nameCompleted: {
    color: Colors.textDim,
    textDecorationLine: 'line-through',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  xpPill: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    backgroundColor: Colors.primaryBg,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  xpPillText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bold,
    color: Colors.primary,
  },
  streakFloat: {
    position: 'absolute',
    bottom: -6,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.accentBg,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  streakFloatText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bold,
    color: Colors.accent,
  },
});
