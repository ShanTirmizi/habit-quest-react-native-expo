import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Spacing, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';

interface TimelineNodeProps {
  color: string;
  isComplete: boolean;
  isLast: boolean;
  children: React.ReactNode;
}

export function TimelineNode({
  color,
  isComplete,
  isLast,
  children,
}: TimelineNodeProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      {/* Timeline track */}
      <View style={styles.track}>
        <View
          style={[
            styles.dot,
            {
              backgroundColor: isComplete ? color : colors.surfaceRaised,
              borderColor: color,
            },
          ]}
        />
        {!isLast ? (
          <View
            style={[
              styles.line,
              {
                backgroundColor: isComplete ? color : colors.border,
              },
            ]}
          />
        ) : null}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  track: {
    width: 24,
    alignItems: 'center',
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  line: {
    width: 2,
    flex: 1,
    marginVertical: 2,
  },
  content: {
    flex: 1,
    paddingBottom: Spacing.lg,
    paddingLeft: Spacing.sm,
  },
});
