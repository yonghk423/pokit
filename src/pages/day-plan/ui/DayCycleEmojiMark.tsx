import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { useTranslation } from '@shared/lib/i18n';
import { IconSymbol } from '@shared/ui/icon-symbol';

/** 데이플랜 레이아웃 탭과 동일한 2아이콘 — 목록 / 시간대 */
const CYCLE_ICONS = ['list.bullet.rectangle', 'sun.horizon.fill'] as const;

const HOLD_MS = 2200;
const FADE_MS = 550;

type Props = {
  size?: number;
  color: string;
};

/** 목록·시간대 아이콘을 천천히 페이드하며 순환 */
export function DayCycleEmojiMark({ size = 22, color }: Props) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const runCycle = () => {
      timer = setTimeout(() => {
        if (cancelled) return;
        Animated.timing(opacity, {
          toValue: 0,
          duration: FADE_MS,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (!finished || cancelled) return;
          setIndex((i) => (i + 1) % CYCLE_ICONS.length);
          Animated.timing(opacity, {
            toValue: 1,
            duration: FADE_MS,
            useNativeDriver: true,
          }).start(({ finished: inDone }) => {
            if (inDone && !cancelled) runCycle();
          });
        });
      }, HOLD_MS);
    };

    runCycle();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      opacity.stopAnimation();
    };
  }, [opacity]);

  return (
    <View style={styles.wrap} accessibilityLabel={t('layoutMode.a11y.cycleIcon')}>
      <Animated.View style={{ opacity }}>
        <IconSymbol name={CYCLE_ICONS[index]} size={size} color={color} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
