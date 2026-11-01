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
  const paper = isDark ? '#262B28' : '#F7F6F4';
  return <Pressable testID="hero-thumbnail-strip-toggle" accessibilityRole="button" accessibilityLabel={labels[collapsed ? 1 : 0]} accessibilityState={{ expanded: !collapsed, disabled: !enabled }} disabled={!enabled} onPress={() => { tapHaptic('select'); setHeroThumbnailStripCollapsed(!collapsed); }} style={({ pressed }) => ({ width, minWidth: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: !enabled ? 0.3 : pressed ? 0.6 : collapsed ? 0.55 : 1 })}>
    <Svg width={28} height={26} viewBox="0 0 32 28" accessible={false}>
      <Path d="M2 4.5 15 3.8 16 25 3 25.4Z" fill={paper} stroke={ink} strokeWidth={1.1} strokeLinejoin="round" />
      <Path d="M9 2.8 22 3.2 22.5 24.4 9.3 24.7Z" fill={paper} stroke={ink} strokeWidth={1.1} strokeLinejoin="round" />
      <Path d="M17 4 30 4.6 29.4 25.6 16.7 25Z" fill={paper} stroke={ink} strokeWidth={1.2} strokeLinejoin="round" />
    </Svg>
  </Pressable>;
}
