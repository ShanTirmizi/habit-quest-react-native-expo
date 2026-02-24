import React, { createContext, useContext } from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import { BentoGap, Spacing } from '@/constants/theme';

const screenWidth = Dimensions.get('window').width;

interface BentoContextValue {
  columnWidth: number;
  gap: number;
}

const BentoContext = createContext<BentoContextValue>({
  columnWidth: (screenWidth - Spacing.lg * 2 - BentoGap) / 2,
  gap: BentoGap,
});

export function useBentoContext() {
  return useContext(BentoContext);
}

interface BentoGridProps {
  children: React.ReactNode;
  paddingHorizontal?: number;
  gap?: number;
}

export function BentoGrid({
  children,
  paddingHorizontal = Spacing.lg,
  gap = BentoGap,
}: BentoGridProps) {
  const columnWidth = (screenWidth - paddingHorizontal * 2 - gap) / 2;

  return (
    <BentoContext.Provider value={{ columnWidth, gap }}>
      <View style={[styles.grid, { gap }]}>
        {children}
      </View>
    </BentoContext.Provider>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
