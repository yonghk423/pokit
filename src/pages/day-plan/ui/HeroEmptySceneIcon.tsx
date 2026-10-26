import Svg, { Path } from 'react-native-svg';
import { useTranslation } from '@shared/lib/i18n';

/**
 * Hand-drawn empty comic panel — no mountains/sun placeholder,
 * just a quiet blank frame so “아직 장면이 없음”이 읽힌다.
 */
export function HeroEmptySceneIcon({ color, size = 30 }: { color: string; size?: number }) {
  const { t } = useTranslation();
  return <Svg width={size} height={size * 0.88} viewBox="0 0 36 32" accessible accessibilityRole="image" accessibilityLabel={t('comicDiary.noScenes')}>
    {/* Soft second panel behind — scenes that aren’t there yet */}
    <Path
      d="M7.2 3.4q10.5-.4 21.2.2l.4 4.8"
      fill="none"
      stroke={color}
      strokeWidth={0.95}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={0.35}
    />
    {/* Main empty comic panel */}
    <Path
      d="M3.4 6.2q14.2-.55 28.6.15l.5 19.4q-14.6.7-29.2.1L3.4 6.2"
      fill="none"
      stroke={color}
      strokeWidth={1.35}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Inner margin — keeps the panel looking blank, not like a photo */}
    <Path
      d="M6.6 9.1q11.8-.35 23.1.1l.25 13.6q-11.9.45-23.4.05L6.6 9.1"
      fill="none"
      stroke={color}
      strokeWidth={0.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={0.4}
    />
    {/* Quiet ellipsis: this panel has no scene yet */}
    <Path
      d="M13.1 16.1q.6-.5.7.2M17.8 16.2q.55-.45.65.15M22.5 16q.6-.4.7.25"
      fill="none"
      stroke={color}
      strokeWidth={1.45}
      strokeLinecap="round"
      opacity={0.72}
    />
  </Svg>;
}
