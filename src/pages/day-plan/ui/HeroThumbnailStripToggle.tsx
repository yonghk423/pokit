import { useSyncExternalStore } from 'react';
import { Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTranslation } from '@shared/lib/i18n';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { isHeroThumbnailStripCollapsed, setHeroThumbnailStripCollapsed, subscribeHeroThumbnailStrip } from '@shared/lib/storage/heroThumbnailStripStorage';

export function HeroThumbnailStripToggle({ isDark, enabled, width = 64 }: { isDark: boolean; enabled: boolean; width?: number }) {
  const collapsed = useSyncExternalStore(subscribeHeroThumbnailStrip, isHeroThumbnailStripCollapsed, () => false);
  const { locale } = useTranslation();
  const labels = locale === 'en' ? ['Hide thumbnails', 'Show thumbnails'] : locale === 'ja' ? ['サムネイルを隠す', 'サムネイルを表示'] : locale === 'zh-TW' ? ['收起縮圖', '展開縮圖'] : ['썸네일 접기', '썸네일 펼치기'];
  const ink = isDark ? '#F0EFE9' : '#292E28';
  return <Pressable testID="hero-thumbnail-strip-toggle" accessibilityRole="button" accessibilityLabel={labels[collapsed ? 1 : 0]} accessibilityState={{ expanded: !collapsed, disabled: !enabled }} disabled={!enabled} onPress={() => { tapHaptic('select'); setHeroThumbnailStripCollapsed(!collapsed); }} style={({ pressed }) => ({ width, minWidth: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: !enabled ? 0.3 : pressed ? 0.6 : collapsed ? 0.6 : 0.45 })}>
    <Svg width={24} height={24} viewBox="0 0 28 28" accessible={false}>
      <Path d="M13 4.5H23Q25 4.5 25 6.5V22Q25 24 23 24H13Q11 24 11 22V6.5Q11 4.5 13 4.5ZM7 7V22M3 10V19" fill="none" stroke={ink} strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  </Pressable>;
}
