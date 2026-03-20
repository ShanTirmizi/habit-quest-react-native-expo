import React, { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import {
  NestableDraggableFlatList,
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import * as Haptics from 'expo-haptics';
import { HabitCard } from './HabitCard';
import { ChainPreviewWrapper } from './ChainPreviewWrapper';
import type { Habit } from '@/types';
import type { HabitScheduleInfo } from '@/lib/habit-scheduling';
import type { AutomaticityInfo } from '@/lib/automaticity';
import type { KeystoneInfo } from '@/lib/keystone-detection';

interface DraggableHabitListProps {
  habits: Habit[];
  isCompleted: boolean;
  onToggle: (id: string) => void;
  onPress: (habit: Habit) => void;
  onReorder: (habits: Habit[]) => void;
  chainNameMap?: Map<string, string>;
  scheduleMap?: Map<string, HabitScheduleInfo>;
  automaticityMap?: Map<string, AutomaticityInfo>;
  keystoneMap?: Map<string, KeystoneInfo>;
  chainFollowersMap?: Map<string, Habit[]>;
  completedIds?: Set<string>;
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
  keystoneMap,
  chainFollowersMap,
  completedIds,
}: DraggableHabitListProps) {
  const [expandedChainIds, setExpandedChainIds] = useState<Set<string>>(new Set());

  const toggleChainPreview = useCallback((habitId: string) => {
    Haptics.selectionAsync();
    setExpandedChainIds((prev) => {
      const next = new Set(prev);
      if (next.has(habitId)) next.delete(habitId);
      else next.add(habitId);
      return next;
    });
  }, []);

  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<Habit>) => {
      const info = scheduleMap?.get(item.id);
      const weeklyProgress = info && info.weeklyTarget > 0
        ? { completed: info.weeklyCompleted, target: info.weeklyTarget }
        : undefined;
      const autoInfo = automaticityMap?.get(item.id);
      const chainFollowers = chainFollowersMap?.get(item.id);
      const hasFollowers = !!chainFollowers && chainFollowers.length > 0;
      const isChainExpanded = expandedChainIds.has(item.id);

      const card = (
        <HabitCard
          habit={item}
          isCompleted={isCompleted}
          onToggle={onToggle}
          onPress={onPress}
          drag={() => {
            // Collapse all chain previews when dragging starts
            setExpandedChainIds(new Set());
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            drag();
          }}
          isDragging={isActive}
          chainedToName={item.chainedToHabitId && chainNameMap ? chainNameMap.get(item.chainedToHabitId) : undefined}
          weeklyProgress={weeklyProgress}
          automaticityScore={autoInfo?.score}
          isKeystone={keystoneMap?.get(item.id)?.isKeystone}
          hasChainFollowers={hasFollowers}
          chainFollowerCount={chainFollowers?.length}
          isChainExpanded={isChainExpanded}
          onToggleChainPreview={() => toggleChainPreview(item.id)}
        />
      );

      if (hasFollowers) {
        return (
          <ScaleDecorator activeScale={1.03}>
            <ChainPreviewWrapper
              chainHabits={chainFollowers!}
              isExpanded={isChainExpanded}
              completedIds={completedIds ?? new Set()}
              parentCategory={item.category}
              onPressHabit={onPress}
            >
              {card}
            </ChainPreviewWrapper>
          </ScaleDecorator>
        );
      }

      return (
        <ScaleDecorator activeScale={1.03}>
          {card}
        </ScaleDecorator>
      );
    },
    [isCompleted, onToggle, onPress, chainNameMap, scheduleMap, automaticityMap, keystoneMap, chainFollowersMap, completedIds, expandedChainIds, toggleChainPreview],
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
