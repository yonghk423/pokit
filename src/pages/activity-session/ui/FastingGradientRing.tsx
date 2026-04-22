import { memo } from 'react';
import Svg, { Circle, Defs, LinearGradient, Stop, G } from 'react-native-svg';

type Props = {
  size: number;
  strokeWidth: number;
  /** 0–1 */
  progress: number;
  trackColor?: string;
  gradientId?: string;
};

/** 단식 세션 — 목표 상세와 동일한 모노크롬 링(레거시 API 유지) */
export const FastingGradientRing = memo(function FastingGradientRing({
  size,
  strokeWidth,
  progress,
  trackColor = 'rgba(0,0,0,0.08)',
  gradientId = 'fastingRingGrad',
}: Props) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;
  const clamped = Math.min(1, Math.max(0, progress));
  const offset = c * (1 - clamped);

  return (
    <Svg width={size} height={size}>
      <Defs>
        <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="rgba(0,0,0,0.45)" />
          <Stop offset="100%" stopColor="rgba(0,0,0,0.75)" />
        </LinearGradient>
      </Defs>
      <G transform={`rotate(-90 ${cx} ${cy})`}>
        <Circle cx={cx} cy={cy} r={r} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${c}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </G>
    </Svg>
  );
});
