import { LockActivityPreviewCard } from '../../lib/LockActivityPreviewCard';
import { normalizeWorkDetailConfig } from './workConfig';

export function WorkPreview({
  rhythmTitle,
  dataConfig,
}: {
  rhythmTitle: string;
  dataConfig: unknown;
}) {
  const c = normalizeWorkDetailConfig(dataConfig);
  const progressPct = c.planMin > 0 ? (c.doneMin / c.planMin) * 100 : 0;

  return (
    <LockActivityPreviewCard
      icon="briefcase.fill"
      rhythmTitle={rhythmTitle}
      fallbackTitle="업무"
      metrics={[
        { value: `${c.planMin}분`, label: '집중 계획' },
        { value: `${c.doneMin}분`, label: '진행', valueSize: 'small' },
      ]}
      progressPct={progressPct}
      footerCaption="업무·집중 플로우 잠금화면 미리보기"
    />
  );
}
