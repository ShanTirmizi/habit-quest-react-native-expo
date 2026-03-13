import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontSize, Spacing, Radius, FontFamily, Shadows, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import type { CompassionMessage } from '@/lib/compassion-engine';

interface CompassionCardProps {
  message: CompassionMessage;
  onAction?: () => void;
  onDismiss?: () => void;
}

export function CompassionCard({ message, onAction, onDismiss }: CompassionCardProps) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const iconName = message.tone === 'gentle' ? 'heart-outline' : 'sunny-outline';
  const accentColor = message.tone === 'gentle' ? colors.info : colors.success;

  return (
    <View style={styles.card}>
      {onDismiss ? (
        <Pressable onPress={onDismiss} style={styles.dismiss} hitSlop={8}>
          <Ionicons name="close" size={16} color={isDark ? colors.textMuted : 'rgba(255,255,255,0.6)'} />
        </Pressable>
      ) : null}

      <View style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: isDark ? `${accentColor}15` : 'rgba(255,255,255,0.25)' }]}>
          <Ionicons name={iconName} size={18} color={isDark ? accentColor : '#fff'} />
        </View>
        <Text style={styles.headline}>{message.headline}</Text>
      </View>

      <Text style={styles.body}>{message.body}</Text>

      {onAction ? (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [
            styles.actionButton,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={styles.actionText} numberOfLines={1}>
            {message.actionLabel}
          </Text>
          <Ionicons name="arrow-forward" size={14} color={isDark ? accentColor : '#fff'} style={{ flexShrink: 0 }} />
        </Pressable>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  card: {
    backgroundColor: isDark ? colors.surface : '#D86850',
    borderRadius: 20,
    padding: Spacing.lg,
    gap: Spacing.md,
    ...Shadows.card,
    borderWidth: isDark ? 1 : 0,
    borderColor: colors.borderStrong,
  },
  dismiss: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingRight: 24,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headline: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.bold,
    color: isDark ? colors.foreground : '#FFFFFF',
    flex: 1,
  },
  body: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: isDark ? colors.textSecondary : 'rgba(255, 255, 255, 0.85)',
    lineHeight: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    backgroundColor: isDark ? `${colors.info}15` : 'rgba(255, 255, 255, 0.25)',
  },
  actionText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semibold,
    color: isDark ? colors.info : '#FFFFFF',
    flexShrink: 1,
  },
});
