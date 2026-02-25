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
import type { HabitScheduleInfo } from '@/lib/habit-scheduling';
import type { AutomaticityInfo } from '@/lib/automaticity';

interface DraggableHabitListProps {
  habits: Habit[];
  isCompleted: boolean;
  onToggle: (id: string) => void;
  onPress: (habit: Habit) => void;
  onReorder: (habits: Habit[]) => void;
  chainNameMap?: Map<string, string>;
  scheduleMap?: Map<string, HabitScheduleInfo>;
  automaticityMap?: Map<string, AutomaticityInfo>;
}

export function DraggableHabitList({
  habits,
  isCompleted,
  onToggle,
  onPress,
  onReorder,
  chainNameMap,
  scheduleMap,
  automaticityMap,
}: DraggableHabitListProps) {
  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<Habit>) => {
      const info = scheduleMap?.get(item.id);
      const weeklyProgress = info && info.weeklyTarget > 0
        ? { completed: info.weeklyCompleted, target: info.weeklyTarget }
        : undefined;
      const autoInfo = automaticityMap?.get(item.id);
      return (
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
            chainedToName={item.chainedToHabitId && chainNameMap ? chainNameMap.get(item.chainedToHabitId) : undefined}
            weeklyProgress={weeklyProgress}
            automaticityScore={autoInfo?.score}
          />
        </ScaleDecorator>
      );
    },
    [isCompleted, onToggle, onPress, chainNameMap, scheduleMap, automaticityMap],
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
