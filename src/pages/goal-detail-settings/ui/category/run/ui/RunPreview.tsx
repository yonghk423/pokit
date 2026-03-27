import { LockActivityPreviewCard } from '../../lib/LockActivityPreviewCard';
import { normalizeRunDetailConfig } from './runConfig';

export function RunPreview({
  rhythmTitle,
  dataConfig,
}: {
  rhythmTitle: string;
  dataConfig: unknown;
}) {
  const c = normalizeRunDetailConfig(dataConfig);
  const progressPct = c.targetKm > 0 ? (c.doneKm / c.targetKm) * 100 : 0;

  return (
    <LockActivityPreviewCard
      icon="figure.run"
      rhythmTitle={rhythmTitle}
      fallbackTitle="러닝"
      metrics={[
        { value: `${c.targetKm}km`, label: '목표 거리' },
        { value: `${c.goalMin}분`, label: '목표 시간', valueSize: 'small' },
        { value: `${c.doneKm}km`, label: '현재', valueSize: 'small' },
      ]}
      progressPct={progressPct}
      footerCaption="러닝 플로우 잠금화면 미리보기(향후 Live Activity와 동기화)"
    />
  );
}
