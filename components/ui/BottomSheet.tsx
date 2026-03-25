/**
 * BottomSheet — Production-grade modal bottom sheet wrapper.
 *
 * Built on @gorhom/bottom-sheet v5.
 *
 * KEYBOARD STRATEGY (the hard part):
 * ──────────────────────────────────
 * ALL sheets use dynamic sizing + keyboardBehavior="extend".
 *
 * Why this combination:
 * - Dynamic sizing = sheet is exactly as tall as its content. No gap.
 * - "extend" = when keyboard opens, the sheet stays pinned in place
 *   (it tries to extend to its max snap, but it's already there).
 *   The keyboard overlaps the bottom of the sheet.
 * - Our auto-scroll-to-input code (below) handles scrolling the
 *   BottomSheetScrollView so the focused input is visible above the keyboard.
 * - When the keyboard closes, we force a re-snap to content size
 *   (workaround for a known gorhom bug where the sheet stays expanded).
 *
 * Why NOT "interactive":
 * - "interactive" pushes the entire sheet upward by the keyboard height.
 *   For tall sheets (AddHabit, Chronicles), the content gets pushed OFF
 *   the top of the screen — catastrophic UX.
 *
 * Why NOT fixed snapPoints like ['92%']:
 * - Creates a gap at the bottom when the content is shorter than 92%.
 *   The sheet is always 92% even if content only needs 70%.
 *
 * IMPORTANT: All TextInput components inside this sheet MUST use either:
 *   1. <Input bottomSheet /> — preferred (uses BottomSheetTextInput internally)
 *   2. <BottomSheetTextInput /> — exported from this file for custom styling
 * Using regular <TextInput> from react-native WILL break keyboard handling.
 */
import React, { useCallback, useRef, useEffect, useMemo } from 'react';
import {
  Text,
  TextInput as RNTextInput,
  StyleSheet,
  Dimensions,
  Keyboard,
  Platform,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetBackdrop,
  BottomSheetTextInput as GorhomTextInput,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spacing, FontSize, FontFamily, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/contexts/theme-context';

export { GorhomTextInput as BottomSheetTextInput };

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /**
   * Override snap points (rarely needed). By default all sheets use dynamic
   * sizing which fits exactly to content with no gap.
   */
  snapPoints?: (string | number)[];
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SCROLL_TO_INPUT_PADDING = 40;

export function BottomSheet({ visible, onClose, title, children, snapPoints }: BottomSheetProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheetModal>(null);
  const isPresented = useRef(false);

  // ScrollView ref + scroll offset tracking for auto-scroll-to-input
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scrollViewRef = useRef<any>(null);
  const scrollOffsetY = useRef(0);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollOffsetY.current = e.nativeEvent.contentOffset.y;
    },
    []
  );

  // Present / dismiss based on `visible` prop
  useEffect(() => {
    if (visible && !isPresented.current) {
      sheetRef.current?.present();
      isPresented.current = true;
    } else if (!visible && isPresented.current) {
      sheetRef.current?.dismiss();
      isPresented.current = false;
    }
  }, [visible]);

  // ─── AUTO-SCROLL TO FOCUSED INPUT ─────────────────────────────────────
  // BottomSheetScrollView does NOT auto-scroll to focused inputs.
  // This is a known gap in the gorhom library. We fix it:
  //
  // 1. Listen for keyboard appearance (keyboardWillShow on iOS fires for
  //    every focus change, even when keyboard is already visible)
  // 2. Find the currently focused TextInput
  // 3. Measure its absolute screen position
  // 4. If it overlaps the keyboard, scroll the BottomSheetScrollView
  // ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';

    const sub = Keyboard.addListener(showEvent, (e) => {
      if (!isPresented.current) return;

      setTimeout(() => {
        const currentInput = RNTextInput.State.currentlyFocusedInput();
        if (!currentInput || !scrollViewRef.current) return;

        currentInput.measure(
          (
            _x: number,
            _y: number,
            _width: number,
            height: number,
            _pageX: number,
            pageY: number,
          ) => {
            const inputBottom = pageY + height;
            const keyboardTop = e.endCoordinates.screenY;
            const overlap = inputBottom - keyboardTop + SCROLL_TO_INPUT_PADDING;

            if (overlap > 0 && scrollViewRef.current?.scrollTo) {
              scrollViewRef.current.scrollTo({
                y: scrollOffsetY.current + overlap,
                animated: true,
              });
            }
          },
        );
      }, 120);
    });

    return () => sub.remove();
  }, []);

  // ─── KEYBOARD-HIDE RESTORATION ────────────────────────────────────────
  // gorhom bug: with dynamic sizing, the sheet can stay at its expanded
  // height after the keyboard closes. Force a re-snap to content size.
  // We use keyboardBlurBehavior="none" (because "restore" conflicts with
  // "extend" per gorhom #1894) and handle restoration manually here.
  // ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const event = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const sub = Keyboard.addListener(event, () => {
      if (isPresented.current) {
        setTimeout(() => {
          sheetRef.current?.snapToIndex(0);
        }, 80);
      }
    });
    return () => sub.remove();
  }, []);

  const handleDismiss = useCallback(() => {
    isPresented.current = false;
    scrollOffsetY.current = 0;
    onClose();
  }, [onClose]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        opacity={0.5}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    []
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      // Sizing
      {...(snapPoints
        ? { snapPoints, enableDynamicSizing: false }
        : { enableDynamicSizing: true, maxDynamicContentSize: SCREEN_HEIGHT * 0.92 }
      )}
      // Gestures
      enablePanDownToClose
      // Keyboard: "extend" keeps the sheet pinned (no push-off-screen).
      // "none" blur avoids the extend+restore conflict (gorhom #1894).
      // Our manual listeners above handle scroll-to-input and restoration.
      keyboardBehavior="extend"
      keyboardBlurBehavior="none"
      enableBlurKeyboardOnGesture
      android_keyboardInputMode="adjustResize"
      // Callbacks
      onDismiss={handleDismiss}
      // Visual
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={[styles.handle, { backgroundColor: colors.textMuted }]}
      backgroundStyle={{ backgroundColor: colors.surface }}
      style={styles.sheet}
    >
      <BottomSheetScrollView
        ref={scrollViewRef}
        onScroll={handleScroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, Spacing.md) },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {title ? <Text style={styles.title}>{title}</Text> : null}
        {children}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    sheet: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
    },
    title: {
      fontSize: FontSize.lg,
      fontFamily: FontFamily.bold,
      color: colors.foreground,
      marginBottom: Spacing.lg,
    },
    content: {
      paddingHorizontal: Spacing.xl,
    },
  });
