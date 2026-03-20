import React, { useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/contexts/theme-context';
import { ChainPreview } from './ChainPreview';
import type { Habit } from '@/types';

interface ChainPreviewWrapperProps {
  children: React.ReactNode;
  chainHabits: Habit[];
  isExpanded: boolean;
  completedIds: Set<string>;
  parentCategory?: string;
  onPressHabit?: (habit: Habit) => void;
}

const ANIMATION_DURATION = 300;
const EASING = Easing.out(Easing.cubic);

export function ChainPreviewWrapper({
  children,
  chainHabits,
  isExpanded,
  completedIds,
  parentCategory,
  onPressHabit,
}: ChainPreviewWrapperProps) {
  const { colors, isDark } = useTheme();
  const contentHeight = useSharedValue(0);
  const previewOpacity = useSharedValue(0);
  const measuredHeight = useRef(0);

  // Animate on expand/collapse
  useEffect(() => {
    if (isExpanded) {
      const targetHeight = measuredHeight.current > 0 ? measuredHeight.current : 100;
      contentHeight.value = withTiming(targetHeight, { duration: ANIMATION_DURATION, easing: EASING });
      previewOpacity.value = withTiming(1, { duration: ANIMATION_DURATION, easing: EASING });
    } else {
      contentHeight.value = withTiming(0, { duration: ANIMATION_DURATION, easing: EASING });
      previewOpacity.value = withTiming(0, { duration: ANIMATION_DURATION * 0.6, easing: EASING });
    }
  }, [isExpanded, contentHeight, previewOpacity]);

  const handleLayout = useCallback(
    (e: { nativeEvent: { layout: { height: number } } }) => {
      const h = e.nativeEvent.layout.height;
      if (h > 0) {
        measuredHeight.current = h;
        if (isExpanded && Math.abs(contentHeight.value - h) > 2) {
          contentHeight.value = withTiming(h, { duration: ANIMATION_DURATION, easing: EASING });
        }
      }
    },
    [isExpanded, contentHeight],
  );

  const containerStyle = useAnimatedStyle(() => ({
    height: contentHeight.value,
    opacity: previewOpacity.value,
    overflow: 'hidden' as const,
  }));

  return (
    <View style={styles.wrapper}>
      {children}
      <Animated.View style={containerStyle}>
        <View onLayout={handleLayout} style={styles.inner}>
          <ChainPreview
            chainHabits={chainHabits}
            completedIds={completedIds}
            colors={colors}
            isDark={isDark}
            parentCategory={parentCategory}
            onPressHabit={onPressHabit}
          />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {},
  inner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
});
