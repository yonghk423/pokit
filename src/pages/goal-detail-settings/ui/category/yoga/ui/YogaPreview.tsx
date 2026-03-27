import { LockActivityPreviewCard } from '../../lib/LockActivityPreviewCard';
import { normalizeYogaDetailConfig } from './yogaConfig';

export function YogaPreview({
  rhythmTitle,
  dataConfig,
}: {
  rhythmTitle: string;
  dataConfig: unknown;
}) {
  const c = normalizeYogaDetailConfig(dataConfig);
  const progressPct = c.sessionMin > 0 ? (c.elapsedMin / c.sessionMin) * 100 : 0;

  return (
    <LockActivityPreviewCard
      icon="figure.yoga"
      rhythmTitle={rhythmTitle}
      fallbackTitle="요가"
      noteBelowHeader={c.flowLabel}
      metrics={[
        { value: `${c.sessionMin}분`, label: '세션' },
        { value: `${c.elapsedMin}분`, label: '경과', valueSize: 'small' },
      ]}
      progressPct={progressPct}
      footerCaption="요가 플로우 잠금화면 미리보기"
    />
  );
}
