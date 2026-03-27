import { LockActivityPreviewCard } from '../../lib/LockActivityPreviewCard';
import { normalizeOtherDetailConfig } from './otherConfig';

export function OtherPreview({
  rhythmTitle,
  dataConfig,
}: {
  rhythmTitle: string;
  dataConfig: unknown;
}) {
  const c = normalizeOtherDetailConfig(dataConfig);
  const note = c.memo || '메모를 설정에서 적어 보세요.';

  return (
    <LockActivityPreviewCard
      icon="ellipsis"
      iconWeight="bold"
      rhythmTitle={rhythmTitle}
      fallbackTitle="기타"
      noteBelowHeader={note}
      metrics={[]}
      progressPct={0}
      footerCaption="기타 플로우 잠금화면 미리보기"
    />
  );
}
