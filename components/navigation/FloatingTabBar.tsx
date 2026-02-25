import React, { useMemo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { Shadows, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

type IconName = keyof typeof Ionicons.glyphMap;

interface TabDef {
  routeName: string;
  icon: IconName;
  iconFocused: IconName;
  isCenter?: boolean;
}

const TABS: TabDef[] = [
  { routeName: 'medicines', icon: 'medical-outline', iconFocused: 'medical' },
  { routeName: 'chronicles', icon: 'book-outline', iconFocused: 'book' },
  { routeName: 'index', icon: 'flame-outline', iconFocused: 'flame', isCenter: true },
  { routeName: 'quests', icon: 'shield-outline', iconFocused: 'shield' },
  { routeName: 'insights', icon: 'compass-outline', iconFocused: 'compass' },
];

function TabButton({
  tab,
  isFocused,
  onPress,
  colors,
  styles,
}: {
  tab: TabDef;
  isFocused: boolean;
  onPress: () => void;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.85, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  if (tab.isCenter) {
    return (
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="tab"
        accessibilityState={{ selected: isFocused }}
        style={styles.centerButtonOuter}
      >
        <Animated.View
          style={[
            styles.centerButton,
            isFocused && styles.centerButtonActive,
            animatedStyle,
          ]}
        >
          <Ionicons
            name={isFocused ? tab.iconFocused : tab.icon}
            size={26}
            color={isFocused ? '#FFFFFF' : colors.textSecondary}
          />
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      style={styles.tabButton}
    >
      <Animated.View
        style={[
          styles.tabInner,
          isFocused && styles.tabInnerActive,
          animatedStyle,
        ]}
      >
        <Ionicons
          name={isFocused ? tab.iconFocused : tab.icon}
          size={24}
          color={isFocused ? colors.primary : colors.textMuted}
        />
        {isFocused ? <View style={styles.activeDot} /> : null}
      </Animated.View>
    </Pressable>
  );
}

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.container, { bottom: insets.bottom + 10 }]}>
      <View style={styles.pill}>
        {TABS.map((tab) => {
          const routeIndex = state.routes.findIndex(
            (r) => r.name === tab.routeName
          );
          if (routeIndex === -1) return null;
          const isFocused = state.index === routeIndex;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: state.routes[routeIndex].key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(state.routes[routeIndex].name);
            }
          };

          return (
            <TabButton
              key={tab.routeName}
              tab={tab}
              isFocused={isFocused}
              onPress={onPress}
              colors={colors}
              styles={styles}
            />
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.glass,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    height: 64,
    width: '100%',
    paddingHorizontal: 8,
    ...Shadows.cardRaised,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 40,
    borderRadius: 14,
  },
  tabInnerActive: {
    backgroundColor: colors.primaryBg,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: 2,
  },
  centerButtonOuter: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18,
  },
  centerButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  centerButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDim,
    ...Shadows.neonGlow(colors.primary),
  },
});
