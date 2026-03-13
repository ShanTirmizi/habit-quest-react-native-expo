import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { FontSize, Spacing, Radius, FontFamily, Shadows, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import { GradientCard } from '@/components/ui/GradientCard';
import { Skeleton } from '@/components/ui/Skeleton';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Insight {
  title: string;
  body: string;
  category: string;
  actionable?: string;
}

interface CoachingInsights {
  primaryInsight: Insight;
  secondaryInsights: Insight[];
  todayFocus: string;
}

interface CoachPanelProps {
  userId: Id<'users'>;
}

// ---------------------------------------------------------------------------
// Category mappings
// ---------------------------------------------------------------------------

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  pattern: 'trending-up',
  streak: 'flame',
  mood: 'heart',
  strategy: 'bulb',
  celebration: 'trophy',
  recovery: 'refresh',
  journal: 'book',
};

const DEFAULT_ICON: keyof typeof Ionicons.glyphMap = 'sparkles';

function getCategoryIcon(category: string): keyof typeof Ionicons.glyphMap {
  return CATEGORY_ICONS[category] ?? DEFAULT_ICON;
}

function getCategoryColorValue(category: string, colors: ThemeColors): string {
  const CATEGORY_COLORS: Record<string, string> = {
    pattern: colors.secondary,
    streak: colors.accent,
    mood: colors.categoryHealth,
    strategy: colors.primary,
    celebration: colors.accent,
    recovery: colors.categoryMind,
    journal: colors.categoryLife,
  };
  return CATEGORY_COLORS[category] ?? colors.textSecondary;
}

// ---------------------------------------------------------------------------
// Module-level cache — survives tab navigation, resets on app restart
// ---------------------------------------------------------------------------

let _cachedInsights: CoachingInsights | null = null;
let _cachedAt = 0;
let _cachedUserId: string | null = null;
const CACHE_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

function getCachedInsights(userId: string): CoachingInsights | null {
  if (
    _cachedInsights &&
    _cachedUserId === userId &&
    Date.now() - _cachedAt < CACHE_MAX_AGE
  ) {
    return _cachedInsights;
  }
  return null;
}

function setCachedInsights(userId: string, insights: CoachingInsights) {
  _cachedInsights = insights;
  _cachedAt = Date.now();
  _cachedUserId = userId;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CoachPanel({ userId }: CoachPanelProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const generateInsights = useAction(api.coaching.generateInsights);

  // State — initialize from cache if available
  const cached = getCachedInsights(userId);
  const [insights, setInsights] = useState<CoachingInsights | null>(cached);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insufficientData, setInsufficientData] = useState(false);
  const [expanded, setExpanded] = useState(true);

  // Prevent duplicate fetches within same mount
  const hasFetched = useRef(false);

  // Animated spin for refresh icon
  const spinValue = useRef(new Animated.Value(0)).current;
  const spinAnimation = useRef<Animated.CompositeAnimation | null>(null);

  const startSpin = useCallback(() => {
    spinValue.setValue(0);
    spinAnimation.current = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    );
    spinAnimation.current.start();
  }, [spinValue]);

  const stopSpin = useCallback(() => {
    if (spinAnimation.current) {
      spinAnimation.current.stop();
      spinAnimation.current = null;
    }
    spinValue.setValue(0);
  }, [spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Fetch insights from API and update cache
  const fetchInsights = useCallback(async () => {
    setLoading(true);
    setError(null);
    setInsufficientData(false);
    startSpin();

    try {
      const result = await generateInsights({ userId });

      if (!result || (typeof result === 'object' && 'insufficientData' in result && result.insufficientData)) {
        setInsufficientData(true);
        setInsights(null);
      } else {
        const typedResult = result as CoachingInsights;
        setInsights(typedResult);
        setCachedInsights(userId, typedResult);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setInsights(null);
    } finally {
      setLoading(false);
      stopSpin();
    }
  }, [generateInsights, userId, startSpin, stopSpin]);

  // Auto-fetch on mount — only if no valid cache
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const cachedResult = getCachedInsights(userId);
    if (cachedResult) {
      // Cache is fresh — use it, don't hit the API
      setInsights(cachedResult);
      return;
    }

    fetchInsights();
  }, [fetchInsights, userId]);

  // Refresh handler — always re-fetches (manual override)
  const handleRefresh = useCallback(() => {
    if (loading) return;
    fetchInsights();
  }, [loading, fetchInsights]);

  // Toggle collapse
  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  // ----- Sub-components (inline, using styles from closure) -----

  const LoadingSkeleton = () => (
    <View style={styles.skeletonContainer}>
      <Skeleton width="100%" height={18} />
      <Skeleton width="75%" height={14} style={styles.skeletonRow} />
      <Skeleton width="85%" height={14} style={styles.skeletonRow} />
      <Skeleton width="60%" height={14} style={styles.skeletonRow} />
    </View>
  );

  const ErrorState = ({ onRetry }: { onRetry: () => void }) => (
    <View style={styles.stateContainer}>
      <Ionicons name="moon" size={32} color={colors.textMuted} />
      <Text style={styles.stateTitle}>Dr. Sage is resting...</Text>
      <Text style={styles.stateBody}>
        Unable to generate insights right now. Please try again in a moment.
      </Text>
      <Pressable
        onPress={onRetry}
        style={({ pressed }) => [styles.retryButton, pressed && styles.pressedButton]}
        accessibilityRole="button"
        accessibilityLabel="Retry loading insights"
      >
        <Ionicons name="refresh" size={16} color={colors.primary} />
        <Text style={styles.retryButtonText}>Try Again</Text>
      </Pressable>
    </View>
  );

  const InsufficientDataState = () => (
    <View style={styles.stateContainer}>
      <Ionicons name="leaf" size={32} color={colors.secondary} />
      <Text style={styles.stateTitle}>Building your profile...</Text>
      <Text style={styles.stateBody}>
        Keep building habits and logging your progress. Dr. Sage will have
        personalized insights for you soon.
      </Text>
    </View>
  );

  const InsightCard = ({ insight }: { insight: Insight }) => {
    const iconName = getCategoryIcon(insight.category);
    const iconColor = getCategoryColorValue(insight.category, colors);

    return (
      <View style={styles.secondaryCard}>
        <View style={styles.insightHeader}>
          <Ionicons name={iconName} size={18} color={iconColor} />
          <Text style={styles.secondaryTitle}>{insight.title}</Text>
        </View>
        <Text style={styles.secondaryBody}>{insight.body}</Text>
        {insight.actionable ? (
          <View style={styles.actionableRow}>
            <Ionicons name="bulb" size={14} color={colors.accent} />
            <Text style={styles.actionableText}>{insight.actionable}</Text>
          </View>
        ) : null}
      </View>
    );
  };

  // ----- Render helpers -----

  const renderHeader = () => (
    <Pressable
      onPress={toggleExpanded}
      style={styles.header}
      accessibilityRole="button"
      accessibilityLabel={expanded ? 'Collapse coach panel' : 'Expand coach panel'}
    >
      <View style={styles.headerLeft}>
        <Text style={styles.headerEmoji}>{'\u{1F9D9}'}</Text>
        <View>
          <Text style={styles.headerTitle}>Dr. Sage</Text>
          <Text style={styles.headerSubtitle}>AI Behavior Coach</Text>
        </View>
      </View>
      <View style={styles.headerRight}>
        <Pressable
          onPress={handleRefresh}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressedButton]}
          accessibilityRole="button"
          accessibilityLabel="Refresh insights"
          hitSlop={8}
        >
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Ionicons name="refresh" size={18} color={colors.textSecondary} />
          </Animated.View>
        </Pressable>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.textSecondary}
          style={styles.chevron}
        />
      </View>
    </Pressable>
  );

  const renderPrimaryInsight = (insight: Insight) => {
    const iconName = getCategoryIcon(insight.category);
    const iconColor = getCategoryColorValue(insight.category, colors);

    return (
      <View style={styles.primarySection}>
        <View style={styles.insightHeader}>
          <Ionicons name={iconName} size={22} color={iconColor} />
          <Text style={styles.primaryTitle}>{insight.title}</Text>
        </View>
        <Text style={styles.primaryBody}>{insight.body}</Text>
        {insight.actionable ? (
          <View style={styles.tryThisContainer}>
            <View style={styles.tryThisHeader}>
              <Ionicons name="bulb" size={16} color={colors.accent} />
              <Text style={styles.tryThisLabel}>Try this:</Text>
            </View>
            <Text style={styles.tryThisText}>{insight.actionable}</Text>
          </View>
        ) : null}
      </View>
    );
  };

  const renderTodayFocus = (focus: string) => (
    <View style={styles.todayFocusContainer}>
      <View style={styles.todayFocusHeader}>
        <Ionicons name="flag" size={18} color={colors.primary} />
        <Text style={styles.todayFocusTitle}>Today's Focus</Text>
      </View>
      <Text style={styles.todayFocusBody}>{focus}</Text>
    </View>
  );

  const renderSecondaryInsights = (items: Insight[]) => {
    if (items.length === 0) return null;

    return (
      <View style={styles.secondarySection}>
        <Text style={styles.secondarySectionTitle}>Secondary Insights</Text>
        {items.map((item, index) => (
          <InsightCard key={`${item.category}-${index}`} insight={item} />
        ))}
      </View>
    );
  };

  const renderBody = () => {
    if (loading && !insights) {
      return <LoadingSkeleton />;
    }

    if (error) {
      return <ErrorState onRetry={handleRefresh} />;
    }

    if (insufficientData) {
      return <InsufficientDataState />;
    }

    if (!insights) {
      return null;
    }

    return (
      <View style={styles.body}>
        {renderPrimaryInsight(insights.primaryInsight)}
        {renderTodayFocus(insights.todayFocus)}
        {renderSecondaryInsights(insights.secondaryInsights)}
      </View>
    );
  };

  return (
    <GradientCard
      gradient={[colors.surfaceLight, colors.surface]}
      glowColor={colors.primaryGlow}
      style={styles.container}
    >
      {renderHeader()}
      {expanded ? renderBody() : null}
    </GradientCard>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    overflow: 'hidden',
  },

  // --- Header ---
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerEmoji: {
    fontSize: 28,
  },
  headerTitle: {
    fontFamily: FontFamily.extrabold,
    fontSize: FontSize.lg,
    color: colors.foreground,
  },
  headerSubtitle: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    marginLeft: Spacing.xs,
  },
  pressedButton: {
    opacity: 0.6,
  },

  // --- Body ---
  body: {
    marginTop: Spacing.lg,
  },

  // --- Loading ---
  skeletonContainer: {
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  skeletonRow: {
    marginTop: 0,
  },

  // --- State messages ---
  stateContainer: {
    marginTop: Spacing.lg,
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  stateTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.base,
    color: colors.foreground,
    marginTop: Spacing.xs,
  },
  stateBody: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.lg,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: colors.primaryBg,
  },
  retryButtonText: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.sm,
    color: colors.primary,
  },

  // --- Primary insight ---
  primarySection: {
    gap: Spacing.sm,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  primaryTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: colors.foreground,
    flexShrink: 1,
  },
  primaryBody: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: colors.textSecondary,
    lineHeight: 21,
  },

  // --- Try this ---
  tryThisContainer: {
    backgroundColor: colors.accentBg,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.xs,
    gap: Spacing.sm,
  },
  tryThisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  tryThisLabel: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: colors.accent,
  },
  tryThisText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: colors.foreground,
    lineHeight: 21,
  },

  // --- Today's focus ---
  todayFocusContainer: {
    backgroundColor: colors.primaryBg,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  todayFocusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  todayFocusTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: colors.primary,
  },
  todayFocusBody: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: colors.foreground,
    lineHeight: 21,
  },

  // --- Secondary insights ---
  secondarySection: {
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  secondarySectionTitle: {
    fontFamily: FontFamily.semibold,
    fontSize: FontSize.sm,
    color: colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  secondaryCard: {
    backgroundColor: colors.surfaceLight,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: colors.foreground,
    flexShrink: 1,
  },
  secondaryBody: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  actionableRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  actionableText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: colors.accent,
    flexShrink: 1,
    lineHeight: 17,
  },
});
