import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { forwardRef, useImperativeHandle, useRef, useState, type ReactNode } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppModal } from '@shared/ui/app-modal';

export type HeroCardOpen = {
  frame: { left: number; top: number; width: number; height: number }; front: ReactNode;
  readCurrent?: (complete: (card: HeroCardOpen | null) => void) => void;
};
export type HeroCardFlipHandle = { close: () => void };

/** Open details immediately, without a replacement card, fade or rotating sheet. */
export const HeroCardFlip = forwardRef<HeroCardFlipHandle, {
  transition?: 'flip' | 'fade'; cornerRadius?: number; card?: HeroCardOpen | null; isDark?: boolean; imageAspectRatio?: number; paper: string; closeLabel: string; fallbackFront: ReactNode;
  loadingContent?: ReactNode; onClosed: () => void; onFrontReady?: () => void; onRestoreFront?: () => void; children: ReactNode;
}>(function HeroCardFlip({ cornerRadius = 0, paper, closeLabel, onClosed, onRestoreFront, children }, ref) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(true);
  const closing = useRef(false);
  const dismissed = useRef(false);
  const notifyClosed = () => {
    if (dismissed.current) return;
    dismissed.current = true;
    onClosed();
  };
  const close = () => {
    if (closing.current) return;
    closing.current = true;
    Keyboard.dismiss();
    onRestoreFront?.();
    setVisible(false);
    if (Platform.OS !== 'ios') notifyClosed();
  };
  useImperativeHandle(ref, () => ({ close }));
  const targetWidth = Math.min(width - 24, 580);
  const top = Math.max(insets.top, 12) + 12;
  return <AppModal visible={visible} transparent animationType="none" onDismiss={notifyClosed} onRequestClose={close}>
    <View testID="hero-card-flip" style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.17)' }}>
      <Pressable style={StyleSheet.absoluteFill} accessibilityLabel={closeLabel} onPress={() => { tapHaptic(); close(); }} />
      <View testID="hero-card-flip-paper" style={{ position: 'absolute', left: (width - targetWidth) / 2, top, width: targetWidth, height: Math.max(1, height - Math.max(insets.top, 12) - Math.max(insets.bottom, 12) - 24) }}>
        <View testID="hero-card-flip-back" style={{ flex: 1, backgroundColor: paper, overflow: 'hidden', borderRadius: cornerRadius }}>{children}</View>
      </View>
    </View>
  </AppModal>;
});
