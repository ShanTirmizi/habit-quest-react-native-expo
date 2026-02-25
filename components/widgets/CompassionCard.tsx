import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontSize, Spacing, Radius, FontFamily, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import type { CompassionMessage } from '@/lib/compassion-engine';

interface CompassionCardProps {
  message: CompassionMessage;
  onAction?: () => void;
  onDismiss?: () => void;
}

export function CompassionCard({ message, onAction, onDismiss }: CompassionCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const iconName = message.tone === 'gentle' ? 'heart-outline' : 'sunny-outline';
  const accentColor = message.tone === 'gentle' ? colors.info : colors.success;

  return (
    <View style={[styles.card, { borderColor: `${accentColor}30` }]}>
      {onDismiss ? (
        <Pressable onPress={onDismiss} style={styles.dismiss} hitSlop={8}>
          <Ionicons name="close" size={16} color={colors.textMuted} />
        </Pressable>
      ) : null}

      <View style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: `${accentColor}15` }]}>
          <Ionicons name={iconName} size={18} color={accentColor} />
        </View>
        <Text style={styles.headline}>{message.headline}</Text>
      </View>

      <Text style={styles.body}>{message.body}</Text>

      {onAction ? (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: `${accentColor}15`, borderColor: `${accentColor}40` },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={[styles.actionText, { color: accentColor }]} numberOfLines={1}>
            {message.actionLabel}
          </Text>
          <Ionicons name="arrow-forward" size={14} color={accentColor} style={{ flexShrink: 0 }} />
        </Pressable>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
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
    color: colors.foreground,
    flex: 1,
  },
  body: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  actionText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semibold,
    flexShrink: 1,
  },
});
