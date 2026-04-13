import { View } from 'react-native';

import {
  deriveReadingProgress,
  normalizeReadingLiveActivityConfig,
  readingDisplayTitle,
} from '@entities/day-plan';
import { ReadingSessionCard } from '@widgets/active-session-card';

import {
  SESSION_PREVIEW_PROGRESS01,
  SessionPreviewFootnote,
  sessionPreviewRemainingSec,
} from '../../lib/sessionPreviewShared';

export function ReadingPreview({
  rhythmTitle,
  dataConfig,
}: {
  rhythmTitle: string;
  dataConfig: unknown;
}) {
  const cfg = normalizeReadingLiveActivityConfig(dataConfig);
  const displayTitle = readingDisplayTitle(rhythmTitle, cfg);
  const { progressPct: progressRaw } = deriveReadingProgress(cfg);
  const progressPct = Number.isFinite(progressRaw)
    ? Math.max(0, Math.min(100, Math.round(progressRaw)))
    : Math.round(SESSION_PREVIEW_PROGRESS01 * 100);

  return (
    <View style={{ gap: 10 }}>
      <ReadingSessionCard
        title={displayTitle}
        dataConfig={cfg}
        remainingSec={sessionPreviewRemainingSec()}
        progressPct={progressPct}
        isPaused={false}
      />
      <SessionPreviewFootnote rhythmTitle={rhythmTitle} />
    </View>
  );
}
