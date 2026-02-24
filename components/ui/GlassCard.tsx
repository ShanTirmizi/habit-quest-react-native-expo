import React from 'react';
import { GradientCard } from './GradientCard';
import type { ViewStyle } from 'react-native';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  borderColor?: string;
  padding?: number;
}

// Backward-compatible wrapper — delegates to GradientCard
export function GlassCard({ children, style, onPress, borderColor, padding }: GlassCardProps) {
  return (
    <GradientCard
      onPress={onPress}
      borderAccent={borderColor}
      padding={padding}
      style={style}
    >
      {children}
    </GradientCard>
  );
}
