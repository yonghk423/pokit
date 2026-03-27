import { LockActivityPreviewCard } from '../../lib/LockActivityPreviewCard';
import { normalizeRestDetailConfig } from './restConfig';

export function RestPreview({
  rhythmTitle,
  dataConfig,
}: {
  rhythmTitle: string;
  dataConfig: unknown;
}) {
  const c = normalizeRestDetailConfig(dataConfig);
  const progressPct = c.restMin > 0 ? (c.elapsedMin / c.restMin) * 100 : 0;

  return (
    <LockActivityPreviewCard
      icon="moon.zzz.fill"
      rhythmTitle={rhythmTitle}
      fallbackTitle="휴식"
      metrics={[
        { value: `${c.restMin}분`, label: '휴식 시간' },
        { value: `${c.elapsedMin}분`, label: '경과', valueSize: 'small' },
      ]}
      progressPct={progressPct}
      footerCaption="휴식 플로우 잠금화면 미리보기"
    />
  );
}
