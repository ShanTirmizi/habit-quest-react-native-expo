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
import { Colors, FontSize } from '@/constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CONFETTI_COLORS = [
  Colors.primary,
  Colors.accent,
  Colors.categoryHealth,
  Colors.categoryCareer,
  Colors.categoryMind,
  Colors.rarityLegendary,
];

interface LevelUpCelebrationProps {
  level: number;
  visible: boolean;
  onDismiss: () => void;
}

function ConfettiPiece({ index }: { index: number }) {
  const translateX = useSharedValue(SCREEN_WIDTH / 2);
  const translateY = useSharedValue(SCREEN_HEIGHT / 3);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);

  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
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
        <ConfettiPiece key={i} index={i} />
      ))}

      {/* Level number */}
      <View style={styles.center}>
        <Animated.View style={[styles.levelCircle, levelStyle]}>
          <Text style={styles.levelNumber}>{level}</Text>
        </Animated.View>
        <Animated.View style={textStyle}>
          <Text style={styles.levelUpText}>Level Up!</Text>
          <Text style={styles.levelSubtext}>You reached level {level}</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

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
  levelCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primaryBg,
    borderWidth: 3,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelNumber: {
    fontSize: 48,
    fontWeight: '900',
    color: Colors.primary,
  },
  levelUpText: {
    fontSize: FontSize['4xl'],
    fontWeight: '900',
    color: Colors.accent,
    textAlign: 'center',
  },
  levelSubtext: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  confetti: {
    position: 'absolute',
  },
});
