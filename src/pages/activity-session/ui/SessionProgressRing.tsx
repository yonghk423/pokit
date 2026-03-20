import { memo } from 'react';
import Svg, { Circle, G } from 'react-native-svg';

type SessionProgressRingProps = {
  size: number;
  strokeWidth: number;
  /** 0–1 */
  progress: number;
  trackColor: string;
  accentColor: string;
};

export const SessionProgressRing = memo(function SessionProgressRing({
  size,
  strokeWidth,
  progress,
  trackColor,
  accentColor,
}: SessionProgressRingProps) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;
  const clamped = Math.min(1, Math.max(0, progress));
  const offset = c * (1 - clamped);

  return (
    <Svg width={size} height={size}>
      <G transform={`rotate(-90 ${cx} ${cy})`}>
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          stroke={accentColor}
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
