/**
 * VoiceBorderGlow — Lava-lamp metaball effect with 6 blobs using Skia GLSL.
 *
 * 6 blobs drift around the container, merging and splitting naturally.
 * Blobs can reach the edges — the Skia rounded-rect clip makes them
 * squish against the boundary like real lava against glass.
 * Blob centers are clamped so they never leave the container entirely.
 */
import React, { useEffect, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Canvas,
  Shader,
  Fill,
  Skia,
  Group,
} from '@shopify/react-native-skia';
import {
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  cancelAnimation,
  useDerivedValue,
} from 'react-native-reanimated';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import {
  FontSize,
  Spacing,
  FontFamily,
  type ThemeColors,
} from '@/constants/theme';
import type { VoiceState } from '@/hooks/use-voice-mode';

interface VoiceBorderGlowProps {
  state: VoiceState;
  colors: ThemeColors;
  isDark: boolean;
  companionName: string;
  transcript?: string;
  partialTranscript?: string;
  onStop: () => void;
  /** Hold-to-speak callbacks */
  onMicPressIn?: () => void;
  onMicPressOut?: () => void;
}

const WAVE_HEIGHT = 70;
const CORNER_RADIUS = 16;
const ease = Easing.inOut(Easing.ease);

// ── Blob sizing ──
const BLOB_RADIUS = 14;
const SS_START = 0.75;
// Padding = visible radius so blobs never poke outside.
// visible radius ≈ r / √SS_START ≈ 14 / 0.866 ≈ 16
const EDGE_PAD = 17;

// ── GLSL Metaball Shader — 6 blobs ──
const METABALL_SHADER = Skia.RuntimeEffect.Make(`
  uniform float2 b0, b1, b2, b3, b4, b5;
  uniform float  r0, r1, r2, r3, r4, r5;
  uniform float3 c0, c1, c2, c3, c4, c5;
  uniform float  opacity;

  half4 main(float2 p) {
    float d0 = (r0*r0) / dot(p-b0, p-b0);
    float d1 = (r1*r1) / dot(p-b1, p-b1);
    float d2 = (r2*r2) / dot(p-b2, p-b2);
    float d3 = (r3*r3) / dot(p-b3, p-b3);
    float d4 = (r4*r4) / dot(p-b4, p-b4);
    float d5 = (r5*r5) / dot(p-b5, p-b5);
    float total = d0 + d1 + d2 + d3 + d4 + d5;

    if (total < ${SS_START.toFixed(2)}) return half4(0.0);

    float3 col = (d0*c0 + d1*c1 + d2*c2 + d3*c3 + d4*c4 + d5*c5) / total;

    float alpha = smoothstep(${SS_START.toFixed(2)}, 1.1, total);
    return half4(col * alpha * opacity, alpha * opacity);
  }
`);

if (!METABALL_SHADER) {
  console.error('[VoiceBorderGlow] Failed to compile metaball shader');
}

function hexToRGB(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16) / 255,
    parseInt(h.substring(2, 4), 16) / 255,
    parseInt(h.substring(4, 6), 16) / 255,
  ];
}

// 6 blobs → 12 shared values (x,y each)
const BLOB_COUNT = 6;

export function VoiceBorderGlow({
  state,
  colors,
  isDark,
  companionName,
  transcript,
  partialTranscript,
  onStop,
  onMicPressIn,
  onMicPressOut,
}: VoiceBorderGlowProps) {
  const { width: screenWidth } = useWindowDimensions();
  const containerWidth = screenWidth - Spacing.xl * 2 - 4;

  // Shared values for 6 blob offsets
  const bX0 = useSharedValue(0), bY0 = useSharedValue(0);
  const bX1 = useSharedValue(0), bY1 = useSharedValue(0);
  const bX2 = useSharedValue(0), bY2 = useSharedValue(0);
  const bX3 = useSharedValue(0), bY3 = useSharedValue(0);
  const bX4 = useSharedValue(0), bY4 = useSharedValue(0);
  const bX5 = useSharedValue(0), bY5 = useSharedValue(0);
  const fadeIn = useSharedValue(0);

  const allX = [bX0, bX1, bX2, bX3, bX4, bX5];
  const allY = [bY0, bY1, bY2, bY3, bY4, bY5];

  useEffect(() => {
    fadeIn.value = withTiming(1, { duration: 600 });
    return () => { fadeIn.value = 0; };
  }, []);

  // Home positions spread across the container — blobs can roam freely
  const layout = useMemo(() => {
    const w = containerWidth;
    const h = WAVE_HEIGHT;
    const cx = w / 2;
    const cy = h / 2;
    return {
      homes: [
        [w * 0.13, cy - 4],   // far left
        [w * 0.32, cy + 5],   // left-center
        [w * 0.50, cy - 3],   // center
        [w * 0.68, cy + 4],   // right-center
        [w * 0.87, cy - 2],   // far right
        [w * 0.45, cy + 2],   // center (overlapping for more merging)
      ] as [number, number][],
      // Max travel: how far a blob can go from home without its CENTER leaving the container
      maxTravel: (hx: number, hy: number) => ({
        mx: Math.min(hx - EDGE_PAD, w - EDGE_PAD - hx),
        my: Math.min(hy - EDGE_PAD, h - EDGE_PAD - hy),
      }),
    };
  }, [containerWidth]);

  // ── Animate all 6 blobs ──
  useEffect(() => {
    [...allX, ...allY].forEach(v => cancelAnimation(v));

    const p = STATE_PARAMS[state];

    // Each blob gets unique phase, speed multiplier, and amplitude
    const configs = [
      { phX: 0,    phY: 0,    sM: 1.0,  aM: 1.0  },
      { phX: 0.18, phY: 0.10, sM: 1.15, aM: 0.9  },
      { phX: 0.36, phY: 0.25, sM: 0.85, aM: 0.8  },
      { phX: 0.55, phY: 0.40, sM: 1.25, aM: 0.95 },
      { phX: 0.72, phY: 0.55, sM: 0.95, aM: 0.85 },
      { phX: 0.42, phY: 0.68, sM: 1.1,  aM: 0.75 },
    ];

    for (let i = 0; i < BLOB_COUNT; i++) {
      const c = configs[i];
      const home = layout.homes[i];
      const bounds = layout.maxTravel(home[0], home[1]);
      const ampX = Math.min(p.x * c.aM, bounds.mx);
      const ampY = Math.min(p.y * c.aM, bounds.my);
      const dur = p.speed * c.sM;

      allX[i].value = withRepeat(
        withDelay(p.speed * c.phX,
          withSequence(
            withTiming(-ampX, { duration: dur, easing: ease }),
            withTiming(ampX, { duration: dur, easing: ease }),
          )),
        -1, true,
      );
      allY[i].value = withRepeat(
        withDelay(p.speed * c.phY,
          withSequence(
            withTiming(ampY, { duration: dur * 1.15, easing: ease }),
            withTiming(-ampY, { duration: dur * 1.15, easing: ease }),
          )),
        -1, true,
      );
    }
  }, [state, layout]);

  // Blob colors & radii
  const bc = useMemo(() => BLOB_COLORS[state](colors), [state, colors]);
  const rgb0 = useMemo(() => hexToRGB(bc.c0), [bc.c0]);
  const rgb1 = useMemo(() => hexToRGB(bc.c1), [bc.c1]);
  const rgb2 = useMemo(() => hexToRGB(bc.c2), [bc.c2]);
  const rgb3 = useMemo(() => hexToRGB(bc.c3), [bc.c3]);
  const rgb4 = useMemo(() => hexToRGB(bc.c4), [bc.c4]);
  const rgb5 = useMemo(() => hexToRGB(bc.c5), [bc.c5]);

  // Shader uniforms
  const uniforms = useDerivedValue(() => ({
    b0: [layout.homes[0][0] + bX0.value, layout.homes[0][1] + bY0.value],
    b1: [layout.homes[1][0] + bX1.value, layout.homes[1][1] + bY1.value],
    b2: [layout.homes[2][0] + bX2.value, layout.homes[2][1] + bY2.value],
    b3: [layout.homes[3][0] + bX3.value, layout.homes[3][1] + bY3.value],
    b4: [layout.homes[4][0] + bX4.value, layout.homes[4][1] + bY4.value],
    b5: [layout.homes[5][0] + bX5.value, layout.homes[5][1] + bY5.value],
    r0: BLOB_RADIUS,
    r1: BLOB_RADIUS * 0.85,
    r2: BLOB_RADIUS * 1.1,
    r3: BLOB_RADIUS * 0.9,
    r4: BLOB_RADIUS * 0.95,
    r5: BLOB_RADIUS * 0.8,
    c0: rgb0, c1: rgb1, c2: rgb2, c3: rgb3, c4: rgb4, c5: rgb5,
    opacity: fadeIn.value * (isDark ? 0.9 : 0.85),
  }));

  const containerAnim = useAnimatedStyle(() => ({ opacity: fadeIn.value }));
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const displayText = partialTranscript || transcript || '';
  const statusText = (() => {
    switch (state) {
      case 'listening': return 'Listening...';
      case 'thinking': return `${companionName} is thinking...`;
      case 'speaking': return companionName;
      default: return 'Hold mic to speak';
    }
  })();

  const isListening = state === 'listening';

  return (
    <Animated.View style={[styles.container, containerAnim]}>
      <View style={styles.canvasWrap}>
        <Canvas style={styles.canvas}>
          <Group clip={Skia.RRectXY(
            Skia.XYWHRect(0, 0, containerWidth, WAVE_HEIGHT),
            CORNER_RADIUS,
            CORNER_RADIUS,
          )}>
            <Fill color={isDark ? 'rgba(0,0,0,0.2)' : 'rgba(245,245,245,0.6)'} />
            {METABALL_SHADER && (
              <Fill>
                <Shader source={METABALL_SHADER} uniforms={uniforms} />
              </Fill>
            )}
          </Group>
        </Canvas>
      </View>

      <View style={styles.statusRow}>
        {/* Hold-to-speak mic button */}
        <Pressable
          onPressIn={onMicPressIn}
          onPressOut={onMicPressOut}
          style={({ pressed }) => [
            styles.micHoldButton,
            isListening && styles.micHoldButtonActive,
            pressed && { opacity: 0.85, transform: [{ scale: 0.95 }] },
          ]}
          hitSlop={4}
        >
          <Ionicons
            name={isListening ? 'radio' : 'mic'}
            size={18}
            color="#fff"
          />
        </Pressable>

        <View style={styles.statusCenter}>
          <View style={[styles.statusDot, {
            backgroundColor: state === 'listening' ? colors.primary :
              state === 'thinking' ? colors.accent :
              state === 'speaking' ? '#00D4AA' : colors.textMuted,
          }]} />
          <Text style={styles.statusText} numberOfLines={1}>
            {displayText || statusText}
          </Text>
        </View>

        {/* Close button */}
        <Pressable
          onPress={onStop}
          style={({ pressed }) => [
            styles.stopButton,
            pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] },
          ]}
          hitSlop={8}
        >
          <Ionicons name="close" size={18} color="#fff" />
        </Pressable>
      </View>
    </Animated.View>
  );
}

// ── Movement params per voice state ──
// x/y = max requested amplitude (clamped to what each blob's home allows)
const STATE_PARAMS = {
  idle:      { x: 35, y: 8,  speed: 5000 },
  listening: { x: 45, y: 10, speed: 2000 },
  thinking:  { x: 20, y: 5,  speed: 3500 },
  speaking:  { x: 40, y: 9,  speed: 1600 },
} as const;

// ── Colors per state (6 blobs) ──
type BlobColors6 = { c0: string; c1: string; c2: string; c3: string; c4: string; c5: string };
const BLOB_COLORS: Record<VoiceState, (c: ThemeColors) => BlobColors6> = {
  idle: (c) => ({
    c0: c.primary,
    c1: c.accent,
    c2: c.primary,
    c3: c.accent,
    c4: c.primary,
    c5: c.accent,
  }),
  listening: (c) => ({
    c0: c.primary,
    c1: c.accent,
    c2: '#FF6B2C',
    c3: c.primary,
    c4: c.accent,
    c5: '#FF6B2C',
  }),
  thinking: (c) => ({
    c0: c.accent,
    c1: '#FFD700',
    c2: c.accent,
    c3: '#FFD700',
    c4: c.accent,
    c5: '#FFD700',
  }),
  speaking: (c) => ({
    c0: '#00D4AA',
    c1: '#00E5CC',
    c2: c.primary,
    c3: '#00D4AA',
    c4: '#00E5CC',
    c5: c.primary,
  }),
};

// ── Styles ──
const createStyles = (colors: ThemeColors, _isDark: boolean) =>
  StyleSheet.create({
    container: {
      marginTop: Spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    canvasWrap: {
      height: WAVE_HEIGHT,
      borderRadius: CORNER_RADIUS,
      overflow: 'hidden',
      marginHorizontal: 2,
    },
    canvas: {
      flex: 1,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.sm,
      gap: Spacing.sm,
    },
    micHoldButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    micHoldButtonActive: {
      backgroundColor: '#FF4444',
    },
    statusCenter: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    statusText: {
      flex: 1,
      fontSize: FontSize.sm,
      fontFamily: FontFamily.medium,
      color: colors.textSecondary,
    },
    stopButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#FF4444',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
