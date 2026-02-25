import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FontSize, Spacing, Radius, FontFamily, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import type { FreshStart } from '@/lib/fresh-starts';

interface FreshStartBannerProps {
  freshStart: FreshStart;
  onDismiss?: () => void;
}

const TYPE_CONFIG: Record<FreshStart['type'], { icon: keyof typeof Ionicons.glyphMap; gradient: [string, string] }> = {
  new_week: { icon: 'calendar-outline', gradient: ['#8B5CF6', '#6366F1'] },
  new_month: { icon: 'rocket-outline', gradient: ['#F97316', '#EF4444'] },
  new_year: { icon: 'sparkles', gradient: ['#FBBF24', '#F97316'] },
  new_season: { icon: 'leaf-outline', gradient: ['#10B981', '#059669'] },
  milestone_day: { icon: 'trophy-outline', gradient: ['#FBBF24', '#F59E0B'] },
};

export function FreshStartBanner({ freshStart, onDismiss }: FreshStartBannerProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const config = TYPE_CONFIG[freshStart.type];

  return (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={config.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        {onDismiss ? (
          <Pressable onPress={onDismiss} style={styles.dismiss} hitSlop={8}>
            <Ionicons name="close" size={14} color="rgba(255,255,255,0.6)" />
          </Pressable>
        ) : null}

        <View style={styles.content}>
          <View style={styles.iconRow}>
            <Ionicons name={config.icon} size={18} color="#fff" />
            <Text style={styles.label}>{freshStart.label}</Text>
          </View>
          <Text style={styles.message} numberOfLines={2}>
            {freshStart.message}
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  wrapper: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  gradient: {
    padding: Spacing.md,
    paddingRight: Spacing.xl + 8,
  },
  dismiss: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    zIndex: 1,
  },
  content: {
    gap: 6,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  label: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold,
    color: '#fff',
    letterSpacing: 0.3,
  },
  message: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.medium,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 18,
  },
});
