import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RetroFlatColors, SOLID_SHADOW_OFFSET } from '@shared/config/retroFlat';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useTranslation } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';

type Props = {
  progress: number;
};

/** 스토리 WebView 첫 로딩 — 민트 진행률 바 + 퍼센트 */
export function PokitStoryWebViewProgressLoader({ progress }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const c = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const clamped = Math.min(100, Math.max(0, progress));
  const displayPercent = clamped >= 100 ? 100 : clamped;
  const fillW = Math.max(displayPercent, clamped > 0 ? 4 : 0);
  const face = isDark ? c.surfaceAlt : '#FFFFFF';
  const shadow = isDark ? c.solidShadow : '#000000';

  return (
    <View
      style={[
        styles.shell,
        {
          backgroundColor: c.bg,
          paddingTop: insets.top + 24,
          paddingBottom: Math.max(insets.bottom, 16) + 16,
        },
      ]}>
      <View style={styles.center}>
        <ThemedText style={[styles.brand, { color: c.text }]}>POKIT</ThemedText>
        <ThemedText
          style={[styles.caption, { color: c.textMuted }]}
          lightColor={c.textMuted}
          darkColor={c.textMuted}>
          {t('storyImport.loadingStory')}
        </ThemedText>

        <View
          style={[
            styles.trackShell,
            { marginRight: SOLID_SHADOW_OFFSET, marginBottom: SOLID_SHADOW_OFFSET },
          ]}>
          <View
            pointerEvents="none"
            style={[
              styles.trackShadow,
              {
                backgroundColor: shadow,
                transform: [
                  { translateX: SOLID_SHADOW_OFFSET },
                  { translateY: SOLID_SHADOW_OFFSET },
                ],
              },
            ]}
          />
          <View style={[styles.trackFace, { backgroundColor: face }]}>
            <View
              style={[
                styles.fill,
                {
                  width: `${fillW}%`,
                  backgroundColor: isDark ? c.bgMint : c.primaryContainer,
                },
              ]}
            />
          </View>
        </View>

        <ThemedText style={[styles.percent, { color: c.text }]}>{displayPercent}%</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    paddingHorizontal: 32,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    maxWidth: 280,
    width: '100%',
    alignSelf: 'center',
  },
  brand: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 2.4,
  },
  caption: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
    marginBottom: 8,
  },
  trackShell: {
    width: '100%',
    height: 12,
    position: 'relative',
  },
  trackShadow: {
    ...StyleSheet.absoluteFillObject,
  },
  trackFace: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: 1,
  },
  fill: {
    height: '100%',
  },
  percent: {
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.2,
    marginTop: 4,
  },
});
