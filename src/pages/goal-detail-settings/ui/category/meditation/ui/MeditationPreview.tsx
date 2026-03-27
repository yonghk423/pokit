import { LockActivityPreviewCard } from '../../lib/LockActivityPreviewCard';
import { normalizeMeditationDetailConfig } from './meditationConfig';

export function MeditationPreview({
  rhythmTitle,
  dataConfig,
}: {
  rhythmTitle: string;
  dataConfig: unknown;
}) {
  const c = normalizeMeditationDetailConfig(dataConfig);
  const progressPct = c.sessionMin > 0 ? (c.elapsedMin / c.sessionMin) * 100 : 0;

  return (
    <LockActivityPreviewCard
      icon="brain.head.profile"
      rhythmTitle={rhythmTitle}
      fallbackTitle="명상"
      metrics={[
        { value: `${c.sessionMin}분`, label: '세션' },
        { value: `${c.elapsedMin}분`, label: '경과', valueSize: 'small' },
      ]}
      progressPct={progressPct}
      footerCaption="명상 플로우 잠금화면 미리보기"
    />
  );
}
