import { LockActivityPreviewCard } from '../../lib/LockActivityPreviewCard';
import { normalizeStretchDetailConfig } from './stretchConfig';

export function StretchPreview({
  rhythmTitle,
  dataConfig,
}: {
  rhythmTitle: string;
  dataConfig: unknown;
}) {
  const c = normalizeStretchDetailConfig(dataConfig);
  const progressPct = c.totalSets > 0 ? (c.doneSets / c.totalSets) * 100 : 0;

  return (
    <LockActivityPreviewCard
      icon="dumbbell.fill"
      rhythmTitle={rhythmTitle}
      fallbackTitle="피트티스"
      metrics={[
        { value: `${c.totalSets}세트`, label: '목표' },
        { value: `${c.holdSec}초`, label: '유지', valueSize: 'small' },
        { value: `${c.doneSets}세트`, label: '완료', valueSize: 'small' },
      ]}
      progressPct={progressPct}
      footerCaption="피트티스 플로우 잠금화면 미리보기"
    />
  );
}
