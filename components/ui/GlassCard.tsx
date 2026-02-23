import React from 'react';
import { View, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  borderColor?: string;
  padding?: number;
}

export function GlassCard({ children, style, onPress, borderColor, padding }: GlassCardProps) {
  const content = (
    <View
      style={[
        styles.card,
        borderColor ? { borderLeftColor: borderColor, borderLeftWidth: 3 } : null,
        padding !== undefined ? { padding } : null,
        style,
      ]}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    padding: Spacing.lg,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
