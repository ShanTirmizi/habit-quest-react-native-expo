import React, { useRef, useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle, LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Radius, FontSize, Spacing, FontFamily, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';

interface Segment {
  label: string;
  value: string;
  badge?: number;
}

interface SegmentedControlProps {
  segments: Segment[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  style?: ViewStyle;
}

export function SegmentedControl({
  segments,
  selectedValue,
  onValueChange,
  style,
}: SegmentedControlProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const layouts = useRef<Record<string, { x: number; width: number }>>({});
  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);
  const initialized = useRef(false);

  const handleLayout = useCallback((value: string, event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    layouts.current[value] = { x, width };

    // Initialize indicator position on first layout of selected segment
    if (value === selectedValue) {
      if (!initialized.current) {
        indicatorX.value = x;
        indicatorWidth.value = width;
        initialized.current = true;
      } else {
        indicatorX.value = withTiming(x, { duration: 250, easing: Easing.bezier(0.4, 0, 0.2, 1) });
        indicatorWidth.value = withTiming(width, { duration: 250, easing: Easing.bezier(0.4, 0, 0.2, 1) });
      }
    }
  }, [selectedValue]);

  const handlePress = useCallback((value: string) => {
    const layout = layouts.current[value];
    if (layout) {
      indicatorX.value = withTiming(layout.x, { duration: 250, easing: Easing.bezier(0.4, 0, 0.2, 1) });
      indicatorWidth.value = withTiming(layout.width, { duration: 250, easing: Easing.bezier(0.4, 0, 0.2, 1) });
    }
    onValueChange(value);
  }, [onValueChange]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorWidth.value,
  }));

  return (
    <View style={[styles.container, style]} accessibilityRole="tablist">
      {/* Animated indicator */}
      <Animated.View style={[styles.indicator, indicatorStyle]} />

      {segments.map((segment) => {
        const isActive = segment.value === selectedValue;
        return (
          <Pressable
            key={segment.value}
            onPress={() => handlePress(segment.value)}
            onLayout={(e) => handleLayout(segment.value, e)}
            style={styles.segment}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Text style={[styles.label, isActive && styles.labelActive]}>{segment.label}</Text>
            {segment.badge !== undefined && segment.badge > 0 ? (
              <View style={[styles.badge, isActive && styles.badgeActive]}>
                <Text style={[styles.badgeText, isActive && styles.badgeTextActive]}>
                  {segment.badge > 9 ? '9+' : segment.badge}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceLight,
    borderRadius: Radius.md,
    padding: 3,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    backgroundColor: colors.surface,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
    gap: 6,
    zIndex: 1,
  },
  label: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.medium,
    color: colors.textMuted,
  },
  labelActive: {
    color: colors.foreground,
    fontFamily: FontFamily.semibold,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeActive: {
    backgroundColor: colors.primaryBg,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
    color: colors.textMuted,
  },
  badgeTextActive: {
    color: colors.primary,
  },
});
