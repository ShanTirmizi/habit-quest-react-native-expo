import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { FontSize, FontFamily } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';

interface AutomaticityArcProps {
  /** 0-100 score */
  score: number;
  /** Overall size of the component */
  size?: number;
  /** Whether the habit is locked in (95%+) */
  lockedIn?: boolean;
}

/**
 * Tiny circular arc that wraps around the streak badge on HabitCard.
 * Shows automaticity progress as a ring that fills clockwise.
 * At 95%+ the ring turns gold ("locked in").
 */
export function AutomaticityArc({ score, size = 32, lockedIn = false }: AutomaticityArcProps) {
  const { colors } = useTheme();

  const strokeWidth = 2.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, score));
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const arcColor = useMemo(() => {
    if (lockedIn || score >= 95) return '#FFD700'; // Gold
    if (score >= 60) return colors.success;
    if (score >= 25) return colors.primary;
    return colors.textMuted;
  }, [score, lockedIn, colors]);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.surfaceRaised || colors.surfaceLight}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress arc */}
        {score > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={arcColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
      </Svg>
    </View>
  );
}
