import React, { useEffect } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Colors, FontSize, Spacing, Radius, FontFamily, Shadows } from '@/constants/theme';
import { useToast, type ToastType } from '@/contexts/toast-context';

const ICON_MAP: Record<ToastType, keyof typeof Ionicons.glyphMap> = {
  xp: 'star',
  level: 'arrow-up-circle',
  hp: 'heart',
  error: 'alert-circle',
};

const COLOR_MAP: Record<ToastType, string> = {
  xp: Colors.primary,
  level: Colors.accent,
  hp: Colors.hpHigh,
  error: Colors.danger,
};

export function XpToast() {
  const insets = useSafeAreaInsets();
  const { toast, dismissToast } = useToast();

  const translateY = useSharedValue(-60);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (toast) {
      translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      translateY.value = withTiming(-60, { duration: 200 });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [toast]);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY < 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (event.translationY < -20) {
        translateY.value = withTiming(-60, { duration: 150 });
        opacity.value = withTiming(0, { duration: 150 });
        runOnJS(dismissToast)();
      } else {
        translateY.value = withSpring(0, { damping: 15, stiffness: 150 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!toast) return null;

  const icon = ICON_MAP[toast.type];
  const color = COLOR_MAP[toast.type];

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[
          styles.container,
          { top: insets.top + 8 },
          animatedStyle,
        ]}
      >
        <View style={[styles.card, { borderLeftColor: color, borderLeftWidth: 3 }]}>
          <Ionicons name={icon} size={20} color={color} />
          <Text style={styles.message} numberOfLines={2}>{toast.message}</Text>
          {toast.xp ? (
            <Text style={[styles.xp, { color }]}>+{toast.xp} XP</Text>
          ) : null}
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 9999,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surfaceLight,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    ...Shadows.cardRaised,
  },
  message: {
    flex: 1,
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semibold,
    color: Colors.foreground,
  },
  xp: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.extrabold,
  },
});
