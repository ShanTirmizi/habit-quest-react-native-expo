import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface RingData {
  progress: number;
  color: string;
  label: string;
}

interface ConcentricRingsProps {
  rings: RingData[];
  size: number;
  strokeWidth?: number;
  trackColor?: string;
  children?: React.ReactNode;
}

function AnimatedRing({
  cx,
  cy,
  radius,
  circumference,
  color,
  progress,
  strokeWidth,
  trackColor,
}: {
  cx: number;
  cy: number;
  radius: number;
  circumference: number;
  color: string;
  progress: number;
  strokeWidth: number;
  trackColor: string;
}) {
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(Math.min(100, Math.max(0, progress)), {
      duration: 1000,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });
  }, [progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animatedProgress.value / 100),
  }));

  return (
    <>
      <Circle
        cx={cx}
        cy={cy}
        r={radius}
        stroke={trackColor}
        strokeWidth={strokeWidth}
        fill="none"
      />
      <AnimatedCircle
        cx={cx}
        cy={cy}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        animatedProps={animatedProps}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
    </>
  );
}

export function ConcentricRings({
  rings,
  size,
  strokeWidth = 8,
  trackColor = 'rgba(255,255,255,0.06)',
  children,
}: ConcentricRingsProps) {
  const cx = size / 2;
  const cy = size / 2;
  const ringGap = strokeWidth + 6;

  // Calculate the inner radius of the innermost ring to constrain center content
  const innermostRadius = (size - strokeWidth) / 2 - (rings.length - 1) * ringGap;
  const centerSize = Math.max(0, (innermostRadius - strokeWidth / 2) * 2 - 4);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        {rings.map((ring, i) => {
          const radius = (size - strokeWidth) / 2 - i * ringGap;
          const circumference = 2 * Math.PI * radius;
          return (
            <AnimatedRing
              key={ring.label}
              cx={cx}
              cy={cy}
              radius={radius}
              circumference={circumference}
              color={ring.color}
              progress={ring.progress}
              strokeWidth={strokeWidth}
              trackColor={trackColor}
            />
          );
        })}
      </Svg>
      {children ? (
        <View style={[styles.center, { width: centerSize, height: centerSize, borderRadius: centerSize / 2 }]}>
          {children}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
