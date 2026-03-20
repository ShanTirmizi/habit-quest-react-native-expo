import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  cancelAnimation,
  interpolateColor,
} from 'react-native-reanimated';
import {
  FontSize,
  Spacing,
  FontFamily,
  Shadows,
  type ThemeColors,
} from '@/constants/theme';
import type { VoiceState } from '@/hooks/use-voice-mode';

interface VoiceOrbProps {
  state: VoiceState;
  colors: ThemeColors;
  isDark: boolean;
  companionName: string;
  speciesColor: string;
  transcript?: string;
  partialTranscript?: string;
  responseText?: string;
  onClose: () => void;
}

const ORB_SIZE = 160;
const OUTER_RING_SIZE = ORB_SIZE + 40;
const MID_RING_SIZE = ORB_SIZE + 16;

export function VoiceOrb({
  state,
  colors,
  isDark,
  companionName,
  speciesColor,
  transcript,
  partialTranscript,
  responseText,
  onClose,
}: VoiceOrbProps) {
  const outerScale = useSharedValue(1);
  const outerOpacity = useSharedValue(0.3);
  const midScale = useSharedValue(1);
  const coreScale = useSharedValue(1);
  const rotateZ = useSharedValue(0);

  // Drive animations based on state
  useEffect(() => {
    // Cancel previous animations
    cancelAnimation(outerScale);
    cancelAnimation(outerOpacity);
    cancelAnimation(midScale);
    cancelAnimation(coreScale);
    cancelAnimation(rotateZ);

    const easing = Easing.inOut(Easing.ease);

    switch (state) {
      case 'idle':
        // Gentle breathing
        outerScale.value = withRepeat(
          withSequence(
            withTiming(1.06, { duration: 1400, easing }),
            withTiming(1, { duration: 1400, easing }),
          ),
          -1,
          true,
        );
        outerOpacity.value = withRepeat(
          withSequence(
            withTiming(0.4, { duration: 1400, easing }),
            withTiming(0.2, { duration: 1400, easing }),
          ),
          -1,
          true,
        );
        midScale.value = withRepeat(
          withSequence(
            withTiming(1.03, { duration: 1600, easing }),
            withTiming(1, { duration: 1600, easing }),
          ),
          -1,
          true,
        );
        coreScale.value = withTiming(1, { duration: 400 });
        rotateZ.value = withTiming(0, { duration: 400 });
        break;

      case 'listening':
        // Faster, more energetic pulse
        outerScale.value = withRepeat(
          withSequence(
            withTiming(1.18, { duration: 500, easing }),
            withTiming(1, { duration: 500, easing }),
          ),
          -1,
          true,
        );
        outerOpacity.value = withRepeat(
          withSequence(
            withTiming(0.6, { duration: 500, easing }),
            withTiming(0.25, { duration: 500, easing }),
          ),
          -1,
          true,
        );
        midScale.value = withRepeat(
          withSequence(
            withTiming(1.1, { duration: 600, easing }),
            withTiming(0.97, { duration: 600, easing }),
          ),
          -1,
          true,
        );
        coreScale.value = withRepeat(
          withSequence(
            withTiming(1.05, { duration: 400, easing }),
            withTiming(0.98, { duration: 400, easing }),
          ),
          -1,
          true,
        );
        rotateZ.value = withTiming(0, { duration: 300 });
        break;

      case 'thinking':
        // Contract + slow rotation
        outerScale.value = withTiming(0.92, { duration: 600, easing });
        outerOpacity.value = withRepeat(
          withSequence(
            withTiming(0.5, { duration: 800, easing }),
            withTiming(0.2, { duration: 800, easing }),
          ),
          -1,
          true,
        );
        midScale.value = withTiming(0.95, { duration: 600, easing });
        coreScale.value = withRepeat(
          withSequence(
            withTiming(0.93, { duration: 1000, easing }),
            withTiming(0.88, { duration: 1000, easing }),
          ),
          -1,
          true,
        );
        rotateZ.value = withRepeat(
          withTiming(360, { duration: 3000, easing: Easing.linear }),
          -1,
          false,
        );
        break;

      case 'speaking':
        // Rhythmic, confident pulse
        outerScale.value = withRepeat(
          withSequence(
            withTiming(1.12, { duration: 350, easing }),
            withTiming(1.02, { duration: 350, easing }),
          ),
          -1,
          true,
        );
        outerOpacity.value = withRepeat(
          withSequence(
            withTiming(0.7, { duration: 350, easing }),
            withTiming(0.3, { duration: 350, easing }),
          ),
          -1,
          true,
        );
        midScale.value = withRepeat(
          withSequence(
            withTiming(1.06, { duration: 400, easing }),
            withTiming(0.98, { duration: 400, easing }),
          ),
          -1,
          true,
        );
        coreScale.value = withRepeat(
          withSequence(
            withTiming(1.04, { duration: 300, easing }),
            withTiming(1, { duration: 300, easing }),
          ),
          -1,
          true,
        );
        rotateZ.value = withTiming(0, { duration: 300 });
        break;
    }
  }, [state]);

  // Animated styles
  const outerStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: outerScale.value },
      { rotateZ: `${rotateZ.value}deg` },
    ],
    opacity: outerOpacity.value,
  }));

  const midStyle = useAnimatedStyle(() => ({
    transform: [{ scale: midScale.value }],
  }));

  const coreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coreScale.value }],
  }));

  const styles = useMemo(() => createStyles(colors, isDark, speciesColor), [colors, isDark, speciesColor]);

  // Status text
  const statusText = (() => {
    switch (state) {
      case 'idle':
        return 'Tap to speak';
      case 'listening':
        return 'Listening...';
      case 'thinking':
        return `${companionName} is thinking...`;
      case 'speaking':
        return `${companionName} is speaking`;
    }
  })();

  const displayTranscript = partialTranscript || transcript || '';
  const displayResponse = state === 'speaking' ? responseText : '';

  return (
    <View style={styles.container}>
      {/* Close button */}
      <Pressable
        onPress={onClose}
        style={({ pressed }) => [
          styles.closeButton,
          pressed && { opacity: 0.7 },
        ]}
        hitSlop={16}
      >
        <Ionicons name="close" size={28} color={colors.textSecondary} />
      </Pressable>

      {/* Orb area */}
      <View style={styles.orbArea}>
        {/* Outer glow ring */}
        <Animated.View
          style={[
            styles.outerRing,
            outerStyle,
          ]}
        />

        {/* Mid ring */}
        <Animated.View
          style={[
            styles.midRing,
            midStyle,
          ]}
        />

        {/* Core orb */}
        <Animated.View
          style={[
            styles.coreOrb,
            coreStyle,
          ]}
        >
          <Ionicons
            name={state === 'listening' ? 'mic' : state === 'thinking' ? 'ellipsis-horizontal' : 'volume-high'}
            size={40}
            color="#fff"
          />
        </Animated.View>
      </View>

      {/* Status text */}
      <Text style={styles.statusText}>{statusText}</Text>

      {/* Transcript / Response */}
      {displayTranscript ? (
        <View style={styles.transcriptContainer}>
          <Text style={styles.transcriptText} numberOfLines={3}>
            {displayTranscript}
          </Text>
        </View>
      ) : null}

      {displayResponse ? (
        <View style={styles.responseContainer}>
          <Text style={styles.responseText} numberOfLines={4}>
            {displayResponse}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors, isDark: boolean, speciesColor: string) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: Spacing.xl,
    },
    closeButton: {
      position: 'absolute',
      top: 60,
      right: 24,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    orbArea: {
      width: OUTER_RING_SIZE,
      height: OUTER_RING_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
    },
    outerRing: {
      position: 'absolute',
      width: OUTER_RING_SIZE,
      height: OUTER_RING_SIZE,
      borderRadius: OUTER_RING_SIZE / 2,
      backgroundColor: colors.accent,
      ...Shadows.neonGlow(colors.accent),
    },
    midRing: {
      position: 'absolute',
      width: MID_RING_SIZE,
      height: MID_RING_SIZE,
      borderRadius: MID_RING_SIZE / 2,
      backgroundColor: speciesColor || colors.primary,
      opacity: 0.5,
    },
    coreOrb: {
      width: ORB_SIZE,
      height: ORB_SIZE,
      borderRadius: ORB_SIZE / 2,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      ...Shadows.neonGlow(colors.primary),
    },
    statusText: {
      marginTop: Spacing.xl,
      fontSize: FontSize.base,
      fontFamily: FontFamily.semibold,
      color: isDark ? colors.textSecondary : 'rgba(255,255,255,0.7)',
      textAlign: 'center',
    },
    transcriptContainer: {
      marginTop: Spacing.lg,
      paddingHorizontal: Spacing.xl,
      paddingVertical: Spacing.md,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.15)',
      borderRadius: 16,
      maxWidth: '90%',
    },
    transcriptText: {
      fontSize: FontSize.sm,
      fontFamily: FontFamily.medium,
      color: isDark ? colors.foreground : 'rgba(255,255,255,0.9)',
      textAlign: 'center',
      lineHeight: 20,
    },
    responseContainer: {
      marginTop: Spacing.md,
      paddingHorizontal: Spacing.xl,
      paddingVertical: Spacing.md,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)',
      borderRadius: 16,
      maxWidth: '90%',
    },
    responseText: {
      fontSize: FontSize.sm,
      fontFamily: FontFamily.regular,
      color: isDark ? colors.textMuted : 'rgba(255,255,255,0.6)',
      textAlign: 'center',
      fontStyle: 'italic',
      lineHeight: 20,
    },
  });
