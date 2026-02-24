import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';

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
  return (
    <View style={styles.container}>
      {/* Timeline track */}
      <View style={styles.track}>
        <View
          style={[
            styles.dot,
            {
              backgroundColor: isComplete ? color : Colors.surfaceRaised,
              borderColor: color,
            },
          ]}
        />
        {!isLast ? (
          <View
            style={[
              styles.line,
              {
                backgroundColor: isComplete ? color : Colors.border,
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

const styles = StyleSheet.create({
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
    paddingLeft: 4,
  },
});
