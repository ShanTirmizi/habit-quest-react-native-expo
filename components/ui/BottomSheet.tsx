import React, { useCallback, useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, Keyboard, Platform } from 'react-native';
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

// Re-export for consumers that need keyboard-aware TextInput inside sheets
export { GorhomTextInput as BottomSheetTextInput };

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** When provided, use fixed snap points instead of dynamic sizing.
   *  e.g. ['92%'] for a near-full-screen sheet that never resizes. */
  snapPoints?: (string | number)[];
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export function BottomSheet({ visible, onClose, title, children, snapPoints }: BottomSheetProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheetModal>(null);
  const isPresented = useRef(false);

  useEffect(() => {
    if (visible && !isPresented.current) {
      sheetRef.current?.present();
      isPresented.current = true;
    } else if (!visible && isPresented.current) {
      sheetRef.current?.dismiss();
      isPresented.current = false;
    }
  }, [visible]);

  // Work around a gorhom/bottom-sheet bug where enableDynamicSizing +
  // keyboardBehavior="interactive" leaves the sheet at the expanded height
  // after the keyboard closes. Force it to re-snap to its content size.
  useEffect(() => {
    const event = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const sub = Keyboard.addListener(event, () => {
      if (isPresented.current) {
        // Delay slightly so the keyboard animation finishes and the sheet
        // can measure its content at the correct (non-keyboard) height.
        setTimeout(() => {
          sheetRef.current?.snapToIndex(0);
        }, 50);
      }
    });
    return () => sub.remove();
  }, []);

  const handleDismiss = useCallback(() => {
    isPresented.current = false;
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
      {...(snapPoints
        ? { snapPoints }
        : { enableDynamicSizing: true, maxDynamicContentSize: SCREEN_HEIGHT * 0.92 }
      )}
      enablePanDownToClose
      onDismiss={handleDismiss}
      backdropComponent={renderBackdrop}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      handleIndicatorStyle={[styles.handle, { backgroundColor: colors.textMuted }]}
      backgroundStyle={{ backgroundColor: colors.surface }}
      style={styles.sheet}
    >
      <BottomSheetScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.lg }]}
        keyboardShouldPersistTaps="handled"
      >
        {title ? <Text style={styles.title}>{title}</Text> : null}
        {children}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
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
