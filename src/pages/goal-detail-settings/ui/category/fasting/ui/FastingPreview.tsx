import { LockActivityPreviewCard } from '../../lib/LockActivityPreviewCard';
import { normalizeFastingDetailConfig } from './fastingConfig';

export function FastingPreview({
  rhythmTitle,
  dataConfig,
}: {
  rhythmTitle: string;
  dataConfig: unknown;
}) {
  const c = normalizeFastingDetailConfig(dataConfig);
  const progressPct = c.fastingMin > 0 ? (c.elapsedMin / c.fastingMin) * 100 : 0;

  return (
    <LockActivityPreviewCard
      icon="timer"
      rhythmTitle={rhythmTitle}
      fallbackTitle="단식"
      metrics={[
        { value: `${c.fastingMin}분`, label: '목표 단식' },
        { value: `${c.elapsedMin}분`, label: '경과', valueSize: 'small' },
      ]}
      progressPct={progressPct}
      footerCaption="단식 플로우 잠금화면 미리보기"
    />
  );
}
