import { LockActivityPreviewCard } from '../../lib/LockActivityPreviewCard';
import { normalizeWaterDetailConfig } from './waterConfig';

export function WaterPreview({
  rhythmTitle,
  dataConfig,
}: {
  rhythmTitle: string;
  dataConfig: unknown;
}) {
  const c = normalizeWaterDetailConfig(dataConfig);
  const progressPct = c.goalMl > 0 ? (c.drankMl / c.goalMl) * 100 : 0;

  return (
    <LockActivityPreviewCard
      icon="drop.fill"
      rhythmTitle={rhythmTitle}
      fallbackTitle="수분"
      metrics={[
        { value: `${c.goalMl}ml`, label: '목표' },
        { value: `${c.drankMl}ml`, label: '섭취', valueSize: 'small' },
      ]}
      progressPct={progressPct}
      footerCaption="수분 플로우 잠금화면 미리보기"
    />
  );
}
