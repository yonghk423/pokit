import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RetroFlatColors } from '@shared/config/retroFlat';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useTranslation } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';

type Props = {
  progress: number;
};

/** 스토리 WebView 첫 로딩 — 진행률 바 + 퍼센트 */
export function PokitStoryWebViewProgressLoader({ progress }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const c = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const clamped = Math.min(100, Math.max(0, progress));
  const displayPercent = clamped >= 100 ? 100 : clamped;

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
        <ThemedText style={[styles.caption, { color: c.textMuted }]} lightColor={c.textMuted} darkColor={c.textMuted}>
          {t('storyImport.loadingStory')}
        </ThemedText>

        <View style={[styles.track, { borderColor: isDark ? 'rgba(255,255,255,0.22)' : c.borderMuted }]}>
          <View
            style={[
              styles.fill,
              {
                width: `${Math.max(displayPercent, clamped > 0 ? 4 : 0)}%`,
                backgroundColor: c.text,
              },
            ]}
          />
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
  track: {
    width: '100%',
    height: 8,
    borderRadius: 0,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  fill: {
    height: '100%',
    borderRadius: 0,
  },
  percent: {
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.2,
    marginTop: 4,
  },
});
