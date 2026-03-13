import React, { useCallback, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ReAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
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
import { useTheme } from '@/contexts/theme-context';
import type { Habit, HabitCategory, TimeOfDay } from '@/types';
import { BadgePill } from '@/components/ui/BadgePill';

interface HabitCardProps {
  habit: Habit;
  isCompleted: boolean;
  onToggle: (id: string) => void;
  onPress?: (habit: Habit) => void;
  drag?: () => void;
  isDragging?: boolean;
  chainedToName?: string;
  weeklyProgress?: { completed: number; target: number };
  automaticityScore?: number;
  isKeystone?: boolean;
}

const TIME_ICON_NAMES: Record<TimeOfDay, keyof typeof Ionicons.glyphMap | null> = {
  morning: 'sunny-outline',
  afternoon: 'partly-sunny-outline',
  evening: 'moon-outline',
  anytime: null,
};

const SWIPE_THRESHOLD = 70;

export function HabitCard({ habit, isCompleted, onToggle, onPress, drag, isDragging, chainedToName, weeklyProgress, automaticityScore, isKeystone }: HabitCardProps) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const categoryColors = useMemo(() => getCategoryColors(colors), [colors]);
  const categoryCardColors = useMemo(() => getCategoryCardColors(colors), [colors]);

  const categoryColor = categoryColors[habit.category] || colors.textSecondary;
  const cardBg = categoryCardColors[habit.category] || colors.surface;

  // Text/icon colors for contrast on colored cards
  const cardText = colors.categoryCardText;
  const cardTextSub = colors.categoryCardTextSub;
  // Badges: white semi-transparent on colored cards (light), themed on dark
  const badgeBg = isDark ? `${categoryColor}15` : 'rgba(255, 255, 255, 0.35)';
  const badgeTextColor = isDark ? categoryColor : cardText;

  const checkboxScale = useRef(new Animated.Value(1)).current;

  // Card-level celebration pulse (reanimated)
  const cardScale = useSharedValue(1);

  // Swipe-to-complete
  const translateX = useSharedValue(0);

  const triggerComplete = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (!isCompleted) {
      cardScale.value = withSequence(
        withTiming(1.02, { duration: 150 }),
        withTiming(1, { duration: 150 }),
      );
    }
    onToggle(habit.id);
  }, [habit.id, onToggle, isCompleted, cardScale]);

  const enableSwipe = !isCompleted && !habit.hibernatedAt;

  const panGesture = Gesture.Pan()
    .activeOffsetX(10)
    .failOffsetY([-5, 5])
    .enabled(enableSwipe)
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

  const cardScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const handleToggle = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.spring(checkboxScale, { toValue: 0.85, useNativeDriver: true, speed: 50, bounciness: 0 }),
      Animated.spring(checkboxScale, { toValue: 1.15, useNativeDriver: true, speed: 50, bounciness: 0 }),
      Animated.spring(checkboxScale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 0 }),
    ]).start();
    if (!isCompleted) {
      cardScale.value = withSequence(
        withTiming(1.02, { duration: 150 }),
        withTiming(1, { duration: 150 }),
      );
    }
    onToggle(habit.id);
  }, [habit.id, onToggle, checkboxScale, isCompleted, cardScale]);

  const handlePress = useCallback(() => {
    if (onPress) {
      Haptics.selectionAsync();
      onPress(habit);
    }
  }, [habit, onPress]);

  const cardContent = (
    <Pressable
      onPress={handlePress}
      onLongPress={drag}
      delayLongPress={200}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: cardBg },
        isCompleted && styles.cardCompleted,
        pressed && styles.cardPressed,
        isDragging && styles.cardDragging,
      ]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isCompleted }}
      accessibilityLabel={`${habit.name}, ${habit.category}, ${habit.xpReward} XP${isCompleted ? ', completed' : ''}`}
    >
      {/* Main content row */}
      <View style={styles.contentRow}>
        {/* Circular animated checkbox */}
        <Animated.View style={{ transform: [{ scale: checkboxScale }] }}>
          <Pressable
            onPress={handleToggle}
            hitSlop={8}
            style={({ pressed }) => [
              styles.checkbox,
              isCompleted
                ? isDark
                  ? { backgroundColor: categoryColor, borderColor: categoryColor }
                  : { backgroundColor: '#fff', borderColor: '#fff' }
                : { borderColor: isDark ? colors.borderStrong : 'rgba(255, 255, 255, 0.60)' },
              pressed && { transform: [{ scale: 0.9 }] },
            ]}
          >
            {isCompleted ? (
              <Ionicons name="checkmark" size={15} color={isDark ? '#fff' : cardBg} />
            ) : null}
          </Pressable>
        </Animated.View>

        {/* Text content */}
        <View style={styles.content}>
          <Text
            style={[styles.name, { color: cardText }, isCompleted && styles.nameCompleted]}
            numberOfLines={1}
          >
            {habit.name}
          </Text>

          <View style={styles.metaRow}>
            <BadgePill
              label={habit.category.charAt(0).toUpperCase() + habit.category.slice(1)}
              color={badgeTextColor}
              bgColor={badgeBg}
              size="sm"
            />
            {habit.timeOfDay && TIME_ICON_NAMES[habit.timeOfDay] ? (
              <Ionicons
                name={TIME_ICON_NAMES[habit.timeOfDay]!}
                size={13}
                color={cardTextSub}
              />
            ) : null}
            {habit.notes && habit.notes.length > 0 ? (
              <Ionicons name="chatbubble-outline" size={12} color={cardTextSub} />
            ) : null}
            {(habit.trigger || habit.location) ? (
              <Ionicons name="navigate-outline" size={11} color={cardTextSub} />
            ) : null}
            {habit.rewardBundle ? (
              <Ionicons name="gift-outline" size={11} color={isDark ? colors.accent : cardText} />
            ) : null}
            {isKeystone ? (
              <Ionicons name="diamond" size={11} color={isDark ? colors.accent : cardText} />
            ) : null}
            {chainedToName ? (
              <View style={[styles.chainBadge, { backgroundColor: badgeBg }]}>
                <Ionicons name="link" size={10} color={badgeTextColor} />
                <Text style={[styles.chainBadgeText, { color: badgeTextColor }]} numberOfLines={1}>
                  After {chainedToName}
                </Text>
              </View>
            ) : null}
            {weeklyProgress && weeklyProgress.target > 0 ? (
              <View style={[
                styles.weeklyBadge,
                { backgroundColor: badgeBg },
                isDark && weeklyProgress.completed >= weeklyProgress.target && styles.weeklyBadgeDone,
              ]}>
                <Ionicons
                  name="calendar-outline"
                  size={10}
                  color={isDark
                    ? (weeklyProgress.completed >= weeklyProgress.target ? colors.success : colors.secondary)
                    : cardText
                  }
                />
                <Text style={[
                  styles.weeklyBadgeText,
                  { color: isDark ? colors.secondary : cardText },
                  isDark && weeklyProgress.completed >= weeklyProgress.target && { color: colors.success },
                ]}>
                  {weeklyProgress.completed}/{weeklyProgress.target}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {/* XP pill — top-right corner */}
      <View style={[styles.xpPill, { backgroundColor: isDark ? colors.primaryBg : 'rgba(255, 255, 255, 0.35)' }]}>
        <Text style={[styles.xpPillText, { color: isDark ? colors.primary : cardText }]}>
          +{habit.xpReward} XP
        </Text>
      </View>
    </Pressable>
  );

  const streakBadge = habit.streak > 0 ? (
    <View style={[
      styles.streakFloat,
      { backgroundColor: isDark ? colors.accentBg : 'rgba(255, 255, 255, 0.40)' },
      automaticityScore != null && automaticityScore >= 95 && styles.streakFloatLocked,
      isDark && automaticityScore != null && automaticityScore >= 60 && automaticityScore < 95 && styles.streakFloatStrong,
      isDark && automaticityScore != null && automaticityScore >= 25 && automaticityScore < 60 && styles.streakFloatBuilding,
    ]}>
      <Ionicons
        name="flame"
        size={11}
        color={automaticityScore != null && automaticityScore >= 95 ? '#FFD700' : (isDark ? colors.accent : cardText)}
      />
      <Text style={[
        styles.streakFloatText,
        { color: isDark ? colors.accent : cardText },
        automaticityScore != null && automaticityScore >= 95 && { color: '#FFD700' },
      ]}>
        {habit.streak}
      </Text>
    </View>
  ) : null;

  return (
    <ReAnimated.View style={[styles.swipeContainer, cardScaleStyle]}>
      {/* Gradient reveal behind card on swipe */}
      {enableSwipe ? (
        <ReAnimated.View style={[styles.revealBgWrapper, revealStyle]}>
          <LinearGradient
            colors={[colors.success, colors.secondaryDim]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.revealBg}
          >
            <Ionicons name="checkmark-circle" size={28} color="#fff" />
          </LinearGradient>
        </ReAnimated.View>
      ) : null}

      {enableSwipe ? (
        <GestureDetector gesture={panGesture}>
          <ReAnimated.View style={swipeStyle}>
            {cardContent}
            {streakBadge}
          </ReAnimated.View>
        </GestureDetector>
      ) : (
        <View>
          {cardContent}
          {streakBadge}
        </View>
      )}
    </ReAnimated.View>
  );
}

const createStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  swipeContainer: {
    position: 'relative',
    overflow: 'visible',
    borderRadius: 18,
    marginBottom: 10,
  },
  revealBgWrapper: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
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
    borderRadius: 18,
    padding: Spacing.md + 2,
    overflow: 'hidden',
    ...Shadows.card,
    borderWidth: isDark ? 1 : 0,
    borderColor: colors.borderStrong,
  },
  cardCompleted: {
    opacity: 0.5,
  },
  cardPressed: {
    opacity: 0.88,
  },
  cardDragging: {
    opacity: 0.9,
    transform: [{ scale: 1.02 }],
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  nameCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.7,
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
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  xpPillText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bold,
  },
  chainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  chainBadgeText: {
    fontSize: 10,
    fontFamily: FontFamily.medium,
    maxWidth: 100,
  },
  weeklyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  weeklyBadgeDone: {
    backgroundColor: `${colors.success}15`,
  },
  weeklyBadgeText: {
    fontSize: 10,
    fontFamily: FontFamily.semibold,
  },
  streakFloat: {
    position: 'absolute',
    bottom: 6,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  streakFloatLocked: {
    borderWidth: 1,
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
  },
  streakFloatStrong: {
    borderWidth: 1,
    borderColor: colors.success,
  },
  streakFloatBuilding: {
    borderWidth: 1,
    borderColor: `${colors.primary}60`,
  },
  streakFloatText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bold,
  },
});
