import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { cloneElement, forwardRef, isValidElement, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Keyboard, Platform, Pressable, StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppModal } from '@shared/ui/app-modal';

export type HeroCardOpen = {
  frame: { left: number; top: number; width: number; height: number }; front: ReactNode;
  readCurrent?: (complete: (card: HeroCardOpen | null) => void) => void;
};
export type HeroCardFlipHandle = { close: () => void };

/** Show scene details with either the legacy flip or a short native opacity transition. */
export const HeroCardFlip = forwardRef<HeroCardFlipHandle, {
  transition?: 'flip' | 'fade'; cornerRadius?: number; card?: HeroCardOpen | null; isDark?: boolean; imageAspectRatio?: number; paper: string; closeLabel: string; fallbackFront: ReactNode;
  loadingContent?: ReactNode; onClosed: () => void; onFrontReady?: () => void; onRestoreFront?: () => void; children: ReactNode;
}>(function HeroCardFlip({ transition = 'flip', cornerRadius = 0, card, isDark = false, imageAspectRatio = 1.5, paper, closeLabel, fallbackFront, onClosed, onFrontReady, onRestoreFront, loadingContent, children }, ref) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [flipsCard] = useState(() => transition === 'flip' && !!card);
  const [progress] = useState(() => new Animated.Value(flipsCard ? 0 : 1));
  const [sheetOpacity] = useState(() => new Animated.Value(transition === 'fade' ? 0 : 1));
  const [interactive, setInteractive] = useState(false);
  const [shown, setShown] = useState(false);
  const [frontReady, setFrontReady] = useState(false);
  const [contentReady, setContentReady] = useState(transition === 'fade');
  const closing = useRef(false);
  const [visible, setVisible] = useState(true);
  const dismissed = useRef(false);
  const notifyClosed = () => {
    if (dismissed.current) return;
    dismissed.current = true;
    onClosed();
  };
  const dismissModal = () => {
    setVisible(false);
    // iOS reports when its native presenter has released the sheet. Starting the
    // tutorial completion before that handoff can overlap two modal presentations.
    if (Platform.OS !== 'ios') notifyClosed();
  };
  const closeFrames = useRef<number[]>([]);
  const readTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [handingBack, setHandingBack] = useState(false);
  const targetWidth = Math.min(width - 24, 580);
  const targetHeight = Math.max(1, height - Math.max(insets.top, 12) - Math.max(insets.bottom, 12) - 24);
  const targetLeft = (width - targetWidth) / 2;
  const targetTop = Math.max(insets.top, 12) + 12;
  // Retain the opening frame while the back is edited or the keyboard changes its layout.
  const [source, setSource] = useState(() => card?.frame ?? { left: targetLeft, top: (height - 360) / 2, width: targetWidth, height: 360 });
  const [front, setFront] = useState(() => card?.front ?? fallbackFront);
  useEffect(() => () => {
    progress.stopAnimation();
    sheetOpacity.stopAnimation();
    closeFrames.current.forEach(cancelAnimationFrame);
    if (readTimeout.current) clearTimeout(readTimeout.current);
  }, [progress, sheetOpacity]);
  useEffect(() => {
    if (!shown || closing.current) return;
    // A restored tutorial opens without a measured board card. There is no matching
    // front to rotate to or from, so keep the live card visible beneath a plain sheet.
    if (!flipsCard) {
      if (transition === 'fade') {
        Animated.timing(sheetOpacity, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      }
      return;
    }
    let second = 0, third = 0;
    // Paint the replacement front before hiding the real card underneath the modal.
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        setFrontReady(true); onFrontReady?.();
        third = requestAnimationFrame(() => {
          Animated.timing(progress, { toValue: 1, duration: 620, easing: Easing.inOut(Easing.cubic), useNativeDriver: true })
            .start(({ finished }) => { if (finished) { setInteractive(true); setContentReady(true); } });
        });
      });
    });
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(second); cancelAnimationFrame(third); };
  }, [shown, progress, onFrontReady, flipsCard, transition, sheetOpacity]);
  const close = () => {
    if (closing.current) return;
    closing.current = true; Keyboard.dismiss();
    if (!flipsCard) {
      sheetOpacity.stopAnimation();
      setInteractive(false);
      Animated.timing(sheetOpacity, { toValue: 0, duration: 180, useNativeDriver: true })
        .start(() => { onRestoreFront?.(); dismissModal(); });
      return;
    }
    let settled = false;
    const finishClose = () => {
      // Restore the live card under this matching front before removing the modal.
      setHandingBack(true); onRestoreFront?.();
      closeFrames.current.push(requestAnimationFrame(() => {
        closeFrames.current.push(requestAnimationFrame(dismissModal));
      }));
    };
    const turnBack = (current: HeroCardOpen | null) => {
      if (settled) return;
      settled = true;
      if (readTimeout.current) { clearTimeout(readTimeout.current); readTimeout.current = null; }
      // Edits can change the front image, text and natural card height while details are open.
      if (current) { setSource(current.frame); setFront(current.front); }
      setShown(false); setInteractive(false);
      closeFrames.current.push(requestAnimationFrame(() => {
        Animated.timing(progress, { toValue: 0, duration: 540, easing: Easing.inOut(Easing.cubic), useNativeDriver: true })
          .start(({ finished }) => {
            // Interrupted animations still need to dismiss — otherwise ×/닫기 leaves the sheet stuck.
            if (!finished) {
              onRestoreFront?.();
              dismissModal();
              return;
            }
            finishClose();
          });
      }));
    };
    if (card?.readCurrent) {
      card.readCurrent(turnBack);
      // measureInWindow can hang while the deck is opacity:0 under the modal.
      readTimeout.current = setTimeout(() => turnBack(null), 120);
    } else turnBack(null);
  };
  useImperativeHandle(ref, () => ({ close }));
  const grow = (from: number, to: number) => progress.interpolate({ inputRange: [0, 0.46, 1], outputRange: [from, from, to], extrapolate: 'clamp' });
  const frontFace = handingBack && isValidElement<{ style?: StyleProp<ViewStyle> }>(front)
    ? cloneElement(front, { style: [front.props.style, { shadowOpacity: 0, elevation: 0 }] }) : front;
  return <AppModal visible={visible} transparent animationType="none" onShow={() => { if (closing.current) return; if (!flipsCard) { setInteractive(true); setContentReady(true); } setShown(true); }} onDismiss={notifyClosed} onRequestClose={close}>
    <Animated.View testID="hero-card-flip" style={[s.root, { opacity: sheetOpacity }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.17] }) }]} />
      <Pressable style={StyleSheet.absoluteFill} accessibilityLabel={closeLabel} onPress={() => { tapHaptic(); close(); }} />
      <Animated.View testID="hero-card-flip-paper" style={[s.paper, { left: targetLeft, top: targetTop, width: targetWidth, height: targetHeight,
        transform: !flipsCard || interactive ? [] : [
          { translateX: grow(source.left + source.width / 2 - (targetLeft + targetWidth / 2), 0) },
          { translateY: grow(source.top + source.height / 2 - (targetTop + targetHeight / 2), 0) },
          { scaleX: grow(source.width / targetWidth, 1) },
          { scaleY: grow(source.height / targetHeight, 1) },
        ],
      }]}>
        {flipsCard ? <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
          testID="hero-card-flip-front"
          style={[s.face, { opacity: !frontReady || interactive ? 0 : progress.interpolate({ inputRange: [0, 0.499, 0.5, 1], outputRange: [1, 1, 0, 0] }),
            transform: [{ perspective: 1400 }, { rotateY: progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['0deg', '90deg', '90deg'], extrapolate: 'clamp' }) }],
          }]}>
          <View style={{ position: 'absolute', left: (targetWidth - source.width) / 2, top: (targetHeight - source.height) / 2,
            width: source.width, height: source.height,
            transform: [{ scaleX: targetWidth / source.width }, { scaleY: targetHeight / source.height }],
          }}>{frontFace}</View>
        </Animated.View> : null}
        <Animated.View testID="hero-card-flip-back" pointerEvents={interactive ? 'auto' : 'none'} accessibilityElementsHidden={!interactive}
          importantForAccessibility={interactive ? 'auto' : 'no-hide-descendants'}
          style={[s.face, { backgroundColor: paper, overflow: 'hidden', borderRadius: cornerRadius,
            // At rest, editable content has no 3D transform or back-face culling.
            transform: !flipsCard || interactive ? [] : [{ perspective: 1400 }, { rotateY: progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-90deg', '-90deg', '0deg'], extrapolate: 'clamp' }) }],
            opacity: interactive ? 1 : progress.interpolate({ inputRange: [0, 0.499, 0.5, 1], outputRange: [0, 0, 1, 1] }),
          }]}>{contentReady ? children : loadingContent ?? <HeroCardDetailSkeleton isDark={isDark} imageHeight={targetWidth / imageAspectRatio} />}</Animated.View>
      </Animated.View>
    </Animated.View>
  </AppModal>;
});
/** Mirror the detail header, illustration and fields while only the paper is rotating. */
function HeroCardDetailSkeleton({ isDark, imageHeight }: { isDark: boolean; imageHeight: number }) {
  const fill = isDark ? 'rgba(244,245,237,0.12)' : 'rgba(83,87,76,0.10)';
  return <View testID="hero-card-detail-skeleton" pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={s.skeleton}>
    <View style={s.skeletonHead}>
      <View style={[s.skeletonLine, { width: 82, height: 14, backgroundColor: fill }]} />
      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: fill }} />
    </View>
    <View style={[s.skeletonLine, { width: '46%', height: 24, marginVertical: 12, backgroundColor: fill }]} />
    <View style={{ alignSelf: 'stretch', marginHorizontal: -20, height: imageHeight, backgroundColor: fill }} />
    <View style={[s.skeletonLine, { width: '34%', height: 19, marginTop: 22, marginBottom: 12, backgroundColor: fill }]} />
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {[0, 1, 2, 3].map(index => <View key={index} style={{ flex: 1, height: 54, borderRadius: 3, backgroundColor: fill }} />)}
    </View>
    <View style={[s.skeletonLine, { width: '28%', height: 19, marginTop: 22, backgroundColor: fill }]} />
    <View style={[s.skeletonLine, { width: '88%', marginTop: 14, backgroundColor: fill }]} />
    <View style={[s.skeletonLine, { width: '66%', marginTop: 10, backgroundColor: fill }]} />
  </View>;
}
const s = StyleSheet.create({
  skeleton: { flex: 1, overflow: 'hidden', paddingHorizontal: 20 },
  skeletonHead: { height: 44, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  skeletonLine: { height: 10, borderRadius: 4 },
  root: { flex: 1 },
  paper: { position: 'absolute' },
  face: { ...StyleSheet.absoluteFill },
});
