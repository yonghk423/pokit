import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Keyboard, ScrollView, View } from 'react-native';
import { ThemedText } from '@shared/ui/themed-text';
import type { AppFontId } from '@shared/lib/ui-font';
import { HeroPolaroidSurface } from './HeroPolaroidSurface';

export const HeroCardFlipContext = createContext<{ current: (() => void) | null } | null>(null);

/** The main print keeps its story on the reverse, with stable outer geometry. */
export function HeroDiaryCardSides({ children, title, memo, ink, fontId, interactive, paper }: { children: ReactNode; title: string; memo?: string; ink: string; fontId?: AppFontId; interactive: boolean; paper: string }) {
  const [back, setBack] = useState(false);
  const turn = useRef(new Animated.Value(0)).current;
  const turning = useRef(false);
  const flip = () => {
    if (turning.current) return;
    Keyboard.dismiss(); turning.current = true;
    Animated.timing(turn, { toValue: 90, duration: 180, useNativeDriver: true }).start(({ finished }) => {
      if (!finished) { turning.current = false; return; }
      setBack(value => !value); turn.setValue(-90);
      Animated.timing(turn, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => { turning.current = false; });
    });
  };
  const flipHost = useContext(HeroCardFlipContext);
  useEffect(() => {
    if (!interactive || !flipHost) return;
    flipHost.current = flip;
    return () => { if (flipHost.current === flip) flipHost.current = null; };
  });
  return <View style={{ flex: 1 }}>
    <Animated.View testID="hero-main-card-rotating-paper" style={{ flex: 1, backgroundColor: paper, shadowColor: '#262218', shadowOpacity: 0.24, shadowRadius: 11, shadowOffset: { width: 3, height: 9 }, elevation: 8, transform: [{ perspective: 1200 }, { rotateY: turn.interpolate({ inputRange: [-90, 0, 90], outputRange: ['-90deg', '0deg', '90deg'] }) }] }}>
      {paper !== '#000000' ? <HeroPolaroidSurface /> : null}
      <View style={{ flex: 1, display: back ? 'none' : 'flex' }} accessibilityElementsHidden={back}>{children}</View>
      {back ? <ScrollView testID="hero-main-card-back" style={{ flex: 1 }} contentContainerStyle={{ padding: 24, paddingBottom: 58, gap: 16 }}>
        <ThemedText fontId={fontId} style={{ color: ink, fontSize: 21, lineHeight: 30 }}>{title}</ThemedText>
        <ThemedText fontId={fontId} style={{ color: ink, fontSize: 17, lineHeight: 28 }}>{memo?.trim() || '오늘의 이야기를 적어보세요.'}</ThemedText>
      </ScrollView> : null}

    </Animated.View>
  </View>;
}
