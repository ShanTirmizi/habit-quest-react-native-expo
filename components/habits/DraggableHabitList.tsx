import React, { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import {
  NestableDraggableFlatList,
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import * as Haptics from 'expo-haptics';
import { HabitCard } from './HabitCard';
import type { Habit } from '@/types';

interface DraggableHabitListProps {
  habits: Habit[];
  isCompleted: boolean;
  onToggle: (id: string) => void;
  onPress: (habit: Habit) => void;
  onReorder: (habits: Habit[]) => void;
}

export function DraggableHabitList({
  habits,
  isCompleted,
  onToggle,
  onPress,
  onReorder,
}: DraggableHabitListProps) {
  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<Habit>) => (
      <ScaleDecorator activeScale={1.03}>
        <HabitCard
          habit={item}
          isCompleted={isCompleted}
          onToggle={onToggle}
          onPress={onPress}
          drag={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            drag();
          }}
          isDragging={isActive}
        />
      </ScaleDecorator>
    ),
    [isCompleted, onToggle, onPress],
  );

  const handleDragEnd = useCallback(
    ({ data }: { data: Habit[] }) => {
      onReorder(data);
    },
    [onReorder],
  );

  const keyExtractor = useCallback((item: Habit) => item.id, []);

  return (
    <NestableDraggableFlatList
      data={habits}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      onDragEnd={handleDragEnd}
      containerStyle={styles.container}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'visible',
  },
});
