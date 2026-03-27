import { LockActivityPreviewCard } from '../../lib/LockActivityPreviewCard';
import { normalizeStudyDetailConfig } from './studyConfig';

export function StudyPreview({
  rhythmTitle,
  dataConfig,
}: {
  rhythmTitle: string;
  dataConfig: unknown;
}) {
  const c = normalizeStudyDetailConfig(dataConfig);
  const note = c.goalMemo || undefined;

  return (
    <LockActivityPreviewCard
      icon="book.closed.fill"
      rhythmTitle={rhythmTitle}
      fallbackTitle="공부"
      noteBelowHeader={note}
      metrics={[
        { value: '—', label: '세부 지표', valueSize: 'small' },
        { value: '준비 중', label: '추적', valueSize: 'small' },
      ]}
      progressPct={0}
      footerCaption="공부 플로우 전용 레이아웃은 차례로 Live Activity와 맞출 예정이에요."
    />
  );
}
