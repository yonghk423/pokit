import { LockActivityPreviewCard } from '../../lib/LockActivityPreviewCard';
import { normalizeMedicineDetailConfig } from './medicineConfig';

export function MedicinePreview({
  rhythmTitle,
  dataConfig,
}: {
  rhythmTitle: string;
  dataConfig: unknown;
}) {
  const c = normalizeMedicineDetailConfig(dataConfig);
  const progressPct = c.dosesPerDay > 0 ? (c.takenCount / c.dosesPerDay) * 100 : 0;

  return (
    <LockActivityPreviewCard
      icon="cross.case.fill"
      rhythmTitle={rhythmTitle}
      fallbackTitle="약 복용"
      noteBelowHeader={c.doseLabel}
      metrics={[
        { value: `${c.dosesPerDay}회`, label: '하루 횟수' },
        { value: `${c.takenCount}회`, label: '복용함', valueSize: 'small' },
      ]}
      progressPct={progressPct}
      footerCaption="약 복용 플로우 잠금화면 미리보기"
    />
  );
}
