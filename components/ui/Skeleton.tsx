import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, ViewStyle, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Radius, Spacing, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = Radius.md, style }: SkeletonProps) {
  const { colors } = useTheme();
  const translateX = useSharedValue(-SCREEN_WIDTH);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(SCREEN_WIDTH, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          overflow: 'hidden',
          backgroundColor: colors.surfaceLight,
        },
        style,
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, shimmerStyle]}>
        <LinearGradient
          colors={['transparent', `${colors.surfaceRaised}88`, 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ width: SCREEN_WIDTH, height: '100%' }}
        />
      </Animated.View>
    </View>
  );
}

export function SkeletonHabitCard() {
  const { colors } = useTheme();
  const skeletonStyles = useMemo(() => createSkeletonStyles(colors), [colors]);

  return (
    <View style={skeletonStyles.habitCard}>
      <Skeleton width={24} height={24} borderRadius={6} />
      <View style={skeletonStyles.habitContent}>
        <Skeleton width="70%" height={14} />
        <View style={skeletonStyles.habitMeta}>
          <Skeleton width={60} height={10} borderRadius={Radius.full} />
          <Skeleton width={40} height={10} borderRadius={Radius.full} />
        </View>
      </View>
      <Skeleton width={16} height={16} borderRadius={8} />
    </View>
  );
}

export function SkeletonStatsHeader() {
  const { colors } = useTheme();
  const skeletonStyles = useMemo(() => createSkeletonStyles(colors), [colors]);

  return (
    <View style={skeletonStyles.statsCard}>
      <View style={skeletonStyles.statsTopRow}>
        <View style={skeletonStyles.statsLevel}>
          <Skeleton width={44} height={44} borderRadius={22} />
          <View style={{ gap: 4 }}>
            <Skeleton width={80} height={14} />
            <Skeleton width={60} height={10} />
          </View>
        </View>
        <View style={skeletonStyles.statsRight}>
          <Skeleton width={40} height={14} />
          <Skeleton width={40} height={14} />
        </View>
      </View>
      <Skeleton width="100%" height={6} borderRadius={Radius.full} />
      <Skeleton width="100%" height={6} borderRadius={Radius.full} />
      <Skeleton width="100%" height={4} borderRadius={Radius.full} />
    </View>
  );
}

export function SkeletonDashboard() {
  const { colors } = useTheme();
  const skeletonStyles = useMemo(() => createSkeletonStyles(colors), [colors]);

  return (
    <View style={skeletonStyles.dashboard}>
      <SkeletonStatsHeader />
      <View style={skeletonStyles.sectionHeader}>
        <Skeleton width={100} height={12} />
      </View>
      <SkeletonHabitCard />
      <SkeletonHabitCard />
      <SkeletonHabitCard />
    </View>
  );
}

const createSkeletonStyles = (colors: ThemeColors) => StyleSheet.create({
  habitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: Spacing.md,
  },
  habitContent: {
    flex: 1,
    gap: 6,
  },
  habitMeta: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statsCard: {
    backgroundColor: colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  statsTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsLevel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  statsRight: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  dashboard: {
    gap: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  sectionHeader: {
    paddingHorizontal: Spacing.xs,
  },
});
