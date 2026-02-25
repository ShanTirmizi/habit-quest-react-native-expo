import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { FontSize, FontFamily, Spacing, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface LevelUpCelebrationProps {
  level: number;
  visible: boolean;
  onDismiss: () => void;
}

function ConfettiPiece({ index, colors }: { index: number; colors: ThemeColors }) {
  const translateX = useSharedValue(SCREEN_WIDTH / 2);
  const translateY = useSharedValue(SCREEN_HEIGHT / 3);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);

  const confettiColors = useMemo(() => [
    colors.primary,
    colors.accent,
    colors.categoryHealth,
    colors.categoryCareer,
    colors.categoryMind,
    colors.rarityLegendary,
  ], [colors]);

  const color = confettiColors[index % confettiColors.length];
  const size = 8 + (index % 4) * 3;

  useEffect(() => {
    const targetX = Math.random() * SCREEN_WIDTH;
    const targetY = SCREEN_HEIGHT * 0.2 + Math.random() * SCREEN_HEIGHT * 0.6;
    const delay = index * 50;

    opacity.value = withDelay(delay, withTiming(1, { duration: 200 }));
    scale.value = withDelay(delay, withSpring(1, { damping: 8, stiffness: 200 }));
    translateX.value = withDelay(delay, withSpring(targetX, { damping: 10, stiffness: 80 }));
    translateY.value = withDelay(delay, withSpring(targetY, { damping: 8, stiffness: 60 }));

    // Fade out
    opacity.value = withDelay(delay + 2000, withTiming(0, { duration: 1000 }));
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.confetti,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        animStyle,
      ]}
    />
  );
}

export function LevelUpCelebration({ level, visible, onDismiss }: LevelUpCelebrationProps) {
  const { colors } = useTheme();
  const dynamicStyles = useMemo(() => createStyles(colors), [colors]);
  const levelScale = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);

  const confettiPieces = useMemo(() => Array.from({ length: 12 }, (_, i) => i), []);

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      backdropOpacity.value = withTiming(1, { duration: 300 });
      levelScale.value = withDelay(200, withSpring(1, { damping: 8, stiffness: 120 }));
      textOpacity.value = withDelay(600, withTiming(1, { duration: 400 }));

      // Auto dismiss after 4s
      const timeout = setTimeout(() => {
        backdropOpacity.value = withTiming(0, { duration: 400 });
        levelScale.value = withTiming(0, { duration: 300 });
        textOpacity.value = withTiming(0, { duration: 300 });
        setTimeout(() => runOnJS(onDismiss)(), 400);
      }, 4000);

      return () => clearTimeout(timeout);
    }
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const levelStyle = useAnimatedStyle(() => ({
    transform: [{ scale: levelScale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, backdropStyle]}>
      <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />

      {/* Confetti */}
      {confettiPieces.map((i) => (
        <ConfettiPiece key={i} index={i} colors={colors} />
      ))}

      {/* Level number */}
      <View style={styles.center}>
        <Animated.View style={[dynamicStyles.levelCircle, levelStyle]}>
          <Text style={dynamicStyles.levelNumber}>{level}</Text>
        </Animated.View>
        <Animated.View style={textStyle}>
          <Text style={dynamicStyles.levelUpText}>Level Up!</Text>
          <Text style={dynamicStyles.levelSubtext}>You reached level {level}</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

// Static styles that don't depend on theme colors
const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    alignItems: 'center',
    gap: 16,
  },
  confetti: {
    position: 'absolute',
  },
});

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  levelCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primaryBg,
    borderWidth: 3,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelNumber: {
    fontSize: 48,
    fontFamily: FontFamily.extrabold,
    color: colors.primary,
  },
  levelUpText: {
    fontSize: FontSize['4xl'],
    fontFamily: FontFamily.extrabold,
    color: colors.accent,
    textAlign: 'center',
  },
  levelSubtext: {
    fontSize: FontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
});
